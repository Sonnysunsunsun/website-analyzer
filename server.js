require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database(process.env.DATABASE_PATH || './database.sqlite');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        company TEXT,
        subscription_tier TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'active',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        api_key TEXT UNIQUE,
        credits_remaining INTEGER DEFAULT 3,
        credits_used_total INTEGER DEFAULT 0,
        last_credit_reset DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Analysis history table
    db.run(`CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        url TEXT NOT NULL,
        score INTEGER,
        data TEXT,
        credits_used INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Subscription plans table
    db.run(`CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        price DECIMAL(10,2),
        credits_per_month INTEGER,
        features TEXT,
        stripe_price_id TEXT
    )`);

    // Insert default plans
    db.run(`INSERT OR IGNORE INTO plans (name, display_name, price, credits_per_month, features, stripe_price_id) VALUES
        ('free', 'Free', 0, 3, '["3 analyses per month", "Basic reports", "Email support"]', null),
        ('starter', 'Starter', 29, 50, '["50 analyses per month", "Advanced reports", "API access", "Priority support", "Export to PDF"]', 'price_starter'),
        ('professional', 'Professional', 99, 250, '["250 analyses per month", "White-label reports", "API access", "Custom branding", "Priority support", "Bulk analysis"]', 'price_professional'),
        ('enterprise', 'Enterprise', 299, 1000, '["1000 analyses per month", "Custom integrations", "Dedicated support", "SLA guarantee", "Custom features"]', 'price_enterprise')
    `);

    // API usage logs
    db.run(`CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        endpoint TEXT,
        method TEXT,
        status_code INTEGER,
        response_time INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});

const analysisLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 analyses per minute
    message: 'Analysis rate limit exceeded. Please wait before analyzing another site.'
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// API Key authentication for developers
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    db.get('SELECT * FROM users WHERE api_key = ?', [apiKey], (err, user) => {
        if (err || !user) {
            return res.status(403).json({ error: 'Invalid API key' });
        }
        req.user = user;
        next();
    });
};

// Check credits middleware
const checkCredits = async (req, res, next) => {
    const userId = req.user.id;

    db.get('SELECT credits_remaining, subscription_tier FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (user.credits_remaining <= 0 && user.subscription_tier !== 'unlimited') {
            return res.status(402).json({
                error: 'Insufficient credits',
                message: 'Please upgrade your plan to continue analyzing websites.',
                upgrade_url: '/pricing'
            });
        }

        req.userCredits = user.credits_remaining;
        next();
    });
};

// Website Analysis Engine (same as before but with credit tracking)
class WebsiteAnalyzer {
    constructor() {
        this.browser = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async analyzeWebsite(url, userId = null) {
        try {
            // Ensure URL has protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            const page = await this.browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const performanceData = {};
            const startTime = Date.now();

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const loadTime = Date.now() - startTime;
            const metrics = await page.metrics();
            const performanceTiming = JSON.parse(
                await page.evaluate(() => JSON.stringify(window.performance.timing))
            );

            performanceData.loadTime = loadTime;
            performanceData.domContentLoaded = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;
            performanceData.firstContentfulPaint = metrics.FirstMeaningfulPaint || 0;

            const seoData = await this.analyzeSEO(page);
            const mobileData = await this.analyzeMobile(page);
            const securityData = await this.analyzeSecurity(url);
            const contentData = await this.analyzeContent(page);
            const technicalData = await this.analyzeTechnical(page);

            await page.close();

            const overallScore = this.calculateOverallScore({
                performance: performanceData,
                seo: seoData,
                mobile: mobileData,
                security: securityData,
                content: contentData,
                technical: technicalData
            });

            const analysisResult = {
                success: true,
                url: url,
                timestamp: new Date().toISOString(),
                overallScore: overallScore,
                performance: performanceData,
                seo: seoData,
                mobile: mobileData,
                security: securityData,
                content: contentData,
                technical: technicalData,
                recommendations: this.generateRecommendations({
                    performance: performanceData,
                    seo: seoData,
                    mobile: mobileData,
                    security: securityData,
                    content: contentData,
                    technical: technicalData
                })
            };

            // Save analysis to database if user is logged in
            if (userId) {
                db.run(
                    'INSERT INTO analyses (user_id, url, score, data) VALUES (?, ?, ?, ?)',
                    [userId, url, overallScore, JSON.stringify(analysisResult)],
                    (err) => {
                        if (err) console.error('Error saving analysis:', err);
                    }
                );

                // Deduct credit
                db.run(
                    'UPDATE users SET credits_remaining = credits_remaining - 1, credits_used_total = credits_used_total + 1 WHERE id = ?',
                    [userId]
                );
            }

            return analysisResult;

        } catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async analyzeSEO(page) {
        const seoData = {};

        const title = await page.title();
        const metaDescription = await page.$eval('meta[name="description"]', el => el.content).catch(() => '');
        const metaKeywords = await page.$eval('meta[name="keywords"]', el => el.content).catch(() => '');

        const h1Count = await page.$$eval('h1', elements => elements.length);
        const h2Count = await page.$$eval('h2', elements => elements.length);

        const images = await page.$$eval('img', imgs =>
            imgs.map(img => ({
                src: img.src,
                alt: img.alt,
                hasAlt: img.alt && img.alt.trim().length > 0
            }))
        );

        const imagesWithoutAlt = images.filter(img => !img.hasAlt).length;

        const hasSchema = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            return scripts.length > 0;
        });

        seoData.title = {
            content: title,
            length: title.length,
            optimal: title.length >= 30 && title.length <= 60
        };

        seoData.metaDescription = {
            content: metaDescription,
            length: metaDescription.length,
            optimal: metaDescription.length >= 120 && metaDescription.length <= 160
        };

        seoData.headings = {
            h1Count: h1Count,
            h2Count: h2Count,
            hasH1: h1Count > 0,
            multipleH1: h1Count > 1
        };

        seoData.images = {
            total: images.length,
            withoutAlt: imagesWithoutAlt,
            altCoverage: images.length > 0 ? ((images.length - imagesWithoutAlt) / images.length * 100).toFixed(1) : 100
        };

        seoData.structuredData = hasSchema;
        seoData.score = this.calculateSEOScore(seoData);

        return seoData;
    }

    async analyzeMobile(page) {
        const mobileData = {};

        const hasViewport = await page.$eval('meta[name="viewport"]', el => el.content).catch(() => false);

        await page.setViewport({ width: 375, height: 667 });

        const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
        });

        const textSize = await page.evaluate(() => {
            const texts = Array.from(document.querySelectorAll('p, span, div'));
            const sizes = texts.map(el => parseFloat(window.getComputedStyle(el).fontSize));
            return sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 16;
        });

        const touchTargets = await page.evaluate(() => {
            const clickables = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
            return clickables.map(el => {
                const rect = el.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    adequate: rect.width >= 44 && rect.height >= 44
                };
            });
        });

        const inadequateTouchTargets = touchTargets.filter(t => !t.adequate).length;

        mobileData.hasViewport = !!hasViewport;
        mobileData.hasHorizontalScroll = hasHorizontalScroll;
        mobileData.averageTextSize = textSize;
        mobileData.touchTargets = {
            total: touchTargets.length,
            inadequate: inadequateTouchTargets,
            adequatePercentage: touchTargets.length > 0 ? ((touchTargets.length - inadequateTouchTargets) / touchTargets.length * 100).toFixed(1) : 100
        };

        await page.setViewport({ width: 1920, height: 1080 });
        mobileData.score = this.calculateMobileScore(mobileData);

        return mobileData;
    }

    async analyzeSecurity(url) {
        const securityData = {};

        securityData.isHTTPS = url.startsWith('https://');

        try {
            const response = await axios.get(url, {
                maxRedirects: 5,
                validateStatus: () => true,
                timeout: 10000
            });

            const headers = response.headers;

            securityData.headers = {
                'strict-transport-security': !!headers['strict-transport-security'],
                'x-frame-options': !!headers['x-frame-options'],
                'x-content-type-options': !!headers['x-content-type-options'],
                'x-xss-protection': !!headers['x-xss-protection'],
                'content-security-policy': !!headers['content-security-policy']
            };

            securityData.secureHeadersCount = Object.values(securityData.headers).filter(v => v).length;

        } catch (error) {
            console.error('Security check error:', error.message);
            securityData.headers = {};
            securityData.secureHeadersCount = 0;
        }

        securityData.score = this.calculateSecurityScore(securityData);

        return securityData;
    }

    async analyzeContent(page) {
        const contentData = {};

        const textContent = await page.evaluate(() => document.body.innerText);
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

        const hasEmail = await page.evaluate(() => {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            return emailRegex.test(document.body.innerText);
        });

        const hasPhone = await page.evaluate(() => {
            const phoneRegex = /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,}/g;
            return phoneRegex.test(document.body.innerText);
        });

        const socialLinks = await page.$$eval('a', links => {
            const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'pinterest.com'];
            return links.filter(link => socialDomains.some(domain => link.href.includes(domain))).length;
        });

        const ctaButtons = await page.$$eval('button, a.button, a.btn, .cta', elements => elements.length);

        contentData.wordCount = wordCount;
        contentData.hasContactInfo = {
            email: hasEmail,
            phone: hasPhone
        };
        contentData.socialLinks = socialLinks;
        contentData.ctaButtons = ctaButtons;
        contentData.contentDensity = wordCount > 300 ? 'good' : wordCount > 100 ? 'moderate' : 'low';
        contentData.score = this.calculateContentScore(contentData);

        return contentData;
    }

    async analyzeTechnical(page) {
        const technicalData = {};

        const brokenLinks = await page.$$eval('a', links => {
            return links.filter(link => {
                return !link.href || link.href === '#' || link.href.endsWith('#');
            }).length;
        });

        const forms = await page.$$eval('form', forms => forms.length);

        const hasSitemap = await axios.get(page.url().replace(/\/$/, '') + '/sitemap.xml', {
            validateStatus: (status) => status === 200
        }).then(() => true).catch(() => false);

        const hasRobots = await axios.get(page.url().replace(/\/$/, '') + '/robots.txt', {
            validateStatus: (status) => status === 200
        }).then(() => true).catch(() => false);

        const pageSize = await page.evaluate(() => {
            const html = document.documentElement.outerHTML;
            return new Blob([html]).size;
        });

        technicalData.brokenLinks = brokenLinks;
        technicalData.forms = forms;
        technicalData.hasSitemap = hasSitemap;
        technicalData.hasRobots = hasRobots;
        technicalData.pageSize = {
            bytes: pageSize,
            mb: (pageSize / 1024 / 1024).toFixed(2)
        };
        technicalData.score = this.calculateTechnicalScore(technicalData);

        return technicalData;
    }

    calculateSEOScore(seoData) {
        let score = 100;
        if (!seoData.title.optimal) score -= 15;
        if (!seoData.metaDescription.optimal) score -= 15;
        if (!seoData.headings.hasH1) score -= 20;
        if (seoData.headings.multipleH1) score -= 10;
        if (seoData.images.withoutAlt > 0) score -= Math.min(20, seoData.images.withoutAlt * 2);
        if (!seoData.structuredData) score -= 10;
        return Math.max(0, score);
    }

    calculateMobileScore(mobileData) {
        let score = 100;
        if (!mobileData.hasViewport) score -= 25;
        if (mobileData.hasHorizontalScroll) score -= 20;
        if (mobileData.averageTextSize < 14) score -= 15;
        if (mobileData.touchTargets.inadequate > 0) {
            score -= Math.min(25, mobileData.touchTargets.inadequate);
        }
        return Math.max(0, score);
    }

    calculateSecurityScore(securityData) {
        let score = 100;
        if (!securityData.isHTTPS) score -= 40;
        score -= (5 - securityData.secureHeadersCount) * 12;
        return Math.max(0, score);
    }

    calculateContentScore(contentData) {
        let score = 100;
        if (contentData.wordCount < 300) score -= 20;
        if (!contentData.hasContactInfo.email && !contentData.hasContactInfo.phone) score -= 15;
        if (contentData.socialLinks === 0) score -= 10;
        if (contentData.ctaButtons === 0) score -= 15;
        return Math.max(0, score);
    }

    calculateTechnicalScore(technicalData) {
        let score = 100;
        if (technicalData.brokenLinks > 0) score -= Math.min(20, technicalData.brokenLinks * 5);
        if (!technicalData.hasSitemap) score -= 15;
        if (!technicalData.hasRobots) score -= 10;
        if (technicalData.pageSize.mb > 3) score -= 15;
        return Math.max(0, score);
    }

    calculateOverallScore(data) {
        const weights = {
            seo: 0.25,
            performance: 0.20,
            mobile: 0.20,
            security: 0.15,
            content: 0.10,
            technical: 0.10
        };

        let weightedScore = 0;
        const performanceScore = Math.max(0, 100 - (data.performance.loadTime / 100));

        weightedScore += data.seo.score * weights.seo;
        weightedScore += performanceScore * weights.performance;
        weightedScore += data.mobile.score * weights.mobile;
        weightedScore += data.security.score * weights.security;
        weightedScore += data.content.score * weights.content;
        weightedScore += data.technical.score * weights.technical;

        return Math.round(weightedScore);
    }

    generateRecommendations(data) {
        const recommendations = [];

        if (!data.seo.title.optimal) {
            recommendations.push({
                category: 'SEO',
                priority: 'High',
                issue: 'Page title is not optimal length',
                recommendation: `Adjust your page title to be between 30-60 characters. Current: ${data.seo.title.length} characters.`,
                impact: 'High',
                effort: 'Low'
            });
        }

        if (!data.seo.metaDescription.optimal) {
            recommendations.push({
                category: 'SEO',
                priority: 'High',
                issue: 'Meta description is not optimal length',
                recommendation: `Write a meta description between 120-160 characters. Current: ${data.seo.metaDescription.length} characters.`,
                impact: 'High',
                effort: 'Low'
            });
        }

        if (data.seo.images.withoutAlt > 0) {
            recommendations.push({
                category: 'SEO',
                priority: 'Medium',
                issue: `${data.seo.images.withoutAlt} images missing alt text`,
                recommendation: 'Add descriptive alt text to all images for better SEO and accessibility.',
                impact: 'Medium',
                effort: 'Low'
            });
        }

        if (data.performance.loadTime > 3000) {
            recommendations.push({
                category: 'Performance',
                priority: 'High',
                issue: 'Slow page load time',
                recommendation: `Your page takes ${(data.performance.loadTime / 1000).toFixed(1)} seconds to load. Optimize images, minimize CSS/JS, and enable caching.`,
                impact: 'High',
                effort: 'Medium'
            });
        }

        if (!data.mobile.hasViewport) {
            recommendations.push({
                category: 'Mobile',
                priority: 'Critical',
                issue: 'Missing viewport meta tag',
                recommendation: 'Add viewport meta tag to ensure proper mobile rendering.',
                impact: 'Critical',
                effort: 'Low'
            });
        }

        if (!data.security.isHTTPS) {
            recommendations.push({
                category: 'Security',
                priority: 'Critical',
                issue: 'Not using HTTPS',
                recommendation: 'Enable SSL/HTTPS to secure your website and improve SEO rankings.',
                impact: 'Critical',
                effort: 'Medium'
            });
        }

        const priorityOrder = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return recommendations;
    }
}

// Initialize analyzer
const analyzer = new WebsiteAnalyzer();

// Routes

// Public routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

// Auth routes
app.post('/api/auth/register', apiLimiter, async (req, res) => {
    const { email, password, name, company } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const apiKey = 'sk_' + uuidv4().replace(/-/g, '');

        db.run(
            'INSERT INTO users (email, password, name, company, api_key, last_credit_reset) VALUES (?, ?, ?, ?, ?, DATE("now"))',
            [email, hashedPassword, name, company, apiKey],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }

                const token = jwt.sign(
                    { id: this.lastID, email },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    success: true,
                    token,
                    user: {
                        id: this.lastID,
                        email,
                        name,
                        subscription_tier: 'free',
                        credits_remaining: 3
                    }
                });
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', apiLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscription_tier: user.subscription_tier,
                credits_remaining: user.credits_remaining,
                api_key: user.api_key
            }
        });
    });
});

// Protected routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, email, name, company, subscription_tier, credits_remaining, api_key, created_at FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        }
    );
});

app.get('/api/user/history', authenticateToken, (req, res) => {
    db.all('SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch history' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/user/stats', authenticateToken, (req, res) => {
    db.get(`
        SELECT
            COUNT(*) as total_analyses,
            AVG(score) as average_score,
            MAX(score) as best_score,
            MIN(score) as worst_score
        FROM analyses
        WHERE user_id = ?
    `, [req.user.id], (err, stats) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        res.json(stats);
    });
});

// Analysis endpoints
app.post('/api/analyze', authenticateToken, checkCredits, analysisLimiter, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!analyzer.browser) {
            await analyzer.init();
        }

        const results = await analyzer.analyzeWebsite(url, req.user.id);

        res.json({
            ...results,
            credits_remaining: req.userCredits - 1
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed', message: error.message });
    }
});

// Free trial analysis (limited features)
app.post('/api/analyze/trial', analysisLimiter, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Check session for trial usage
        if (!req.session.trialCount) {
            req.session.trialCount = 0;
        }

        if (req.session.trialCount >= 1) {
            return res.status(402).json({
                error: 'Trial limit reached',
                message: 'Sign up for a free account to continue analyzing websites.',
                signup_url: '/signup'
            });
        }

        if (!analyzer.browser) {
            await analyzer.init();
        }

        const results = await analyzer.analyzeWebsite(url);

        // Limit trial results
        results.recommendations = results.recommendations.slice(0, 3);
        results.limitedTrial = true;

        req.session.trialCount++;

        res.json(results);

    } catch (error) {
        console.error('Trial analysis error:', error);
        res.status(500).json({ error: 'Analysis failed', message: error.message });
    }
});

// API endpoint for developers
app.post('/api/v1/analyze', authenticateApiKey, checkCredits, apiLimiter, async (req, res) => {
    const startTime = Date.now();

    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!analyzer.browser) {
            await analyzer.init();
        }

        const results = await analyzer.analyzeWebsite(url, req.user.id);

        // Log API usage
        const responseTime = Date.now() - startTime;
        db.run(
            'INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, '/api/v1/analyze', 'POST', 200, responseTime]
        );

        res.json(results);

    } catch (error) {
        console.error('API analysis error:', error);

        const responseTime = Date.now() - startTime;
        db.run(
            'INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, '/api/v1/analyze', 'POST', 500, responseTime]
        );

        res.status(500).json({ error: 'Analysis failed', message: error.message });
    }
});

// Plans and pricing
app.get('/api/plans', (req, res) => {
    db.all('SELECT * FROM plans ORDER BY price', (err, plans) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch plans' });
        }
        res.json(plans.map(plan => ({
            ...plan,
            features: JSON.parse(plan.features)
        })));
    });
});

// Stripe webhook for subscription updates (placeholder)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
    // Handle Stripe webhook events
    // Update user subscription status
    res.json({ received: true });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Page Not Found</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; }
                .container { text-align: center; }
                h1 { font-size: 72px; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                p { color: #6b7280; margin: 16px 0; }
                a { color: #5b21b6; text-decoration: none; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>404</h1>
                <p>Page not found</p>
                <a href="/">Go back home</a>
            </div>
        </body>
        </html>
    `);
});

// Cron job to reset monthly credits
cron.schedule('0 0 1 * *', () => {
    console.log('Resetting monthly credits...');

    db.all('SELECT id, subscription_tier FROM users', (err, users) => {
        if (err) {
            console.error('Error fetching users for credit reset:', err);
            return;
        }

        users.forEach(user => {
            let credits = 3; // Default free tier

            switch(user.subscription_tier) {
                case 'starter': credits = 50; break;
                case 'professional': credits = 250; break;
                case 'enterprise': credits = 1000; break;
            }

            db.run(
                'UPDATE users SET credits_remaining = ?, last_credit_reset = DATE("now") WHERE id = ?',
                [credits, user.id],
                (err) => {
                    if (err) console.error(`Error resetting credits for user ${user.id}:`, err);
                }
            );
        });
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 SiteAnalyzer Pro running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`💳 Pricing: http://localhost:${PORT}/pricing`);

    try {
        await analyzer.init();
        console.log('✅ Analysis engine ready');
    } catch (error) {
        console.error('❌ Failed to initialize analyzer:', error);
    }
});

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await analyzer.cleanup();
    db.close();
    process.exit(0);
});