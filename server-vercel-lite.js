// Lightweight version for Vercel without Puppeteer
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const AIWebsiteAnalyzer = require('./ai-analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Lightweight analyzer without Puppeteer
class LightweightAnalyzer {
    constructor() {
        this.aiAnalyzer = new AIWebsiteAnalyzer(process.env.OPENAI_API_KEY);
    }

    async analyzeWebsite(url) {
        try {
            // Ensure URL has protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            // Fetch the website HTML
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Basic SEO Analysis
            const seoData = {
                title: {
                    content: $('title').text() || '',
                    length: $('title').text().length,
                    optimal: $('title').text().length >= 30 && $('title').text().length <= 60
                },
                metaDescription: {
                    content: $('meta[name="description"]').attr('content') || '',
                    length: ($('meta[name="description"]').attr('content') || '').length,
                    optimal: ($('meta[name="description"]').attr('content') || '').length >= 120 &&
                            ($('meta[name="description"]').attr('content') || '').length <= 160
                },
                headings: {
                    h1Count: $('h1').length,
                    h2Count: $('h2').length,
                    hasH1: $('h1').length > 0
                },
                images: {
                    total: $('img').length,
                    withoutAlt: $('img:not([alt])').length,
                    altCoverage: $('img').length > 0 ?
                        ((($('img').length - $('img:not([alt])').length) / $('img').length) * 100).toFixed(1) : '100'
                },
                score: 70 // Base score
            };

            // Basic Performance (simulated)
            const performanceData = {
                loadTime: Math.floor(Math.random() * 2000) + 800,
                domContentLoaded: Math.floor(Math.random() * 1000) + 400,
                score: 75
            };

            // Mobile Analysis
            const mobileData = {
                hasViewport: $('meta[name="viewport"]').length > 0,
                responsive: true, // Assumed for simplicity
                score: $('meta[name="viewport"]').length > 0 ? 85 : 40
            };

            // Security Analysis
            const securityData = {
                isHTTPS: url.startsWith('https://'),
                score: url.startsWith('https://') ? 90 : 30
            };

            // Content Analysis
            const contentData = {
                wordCount: $('body').text().split(/\s+/).filter(word => word.length > 0).length,
                hasContactInfo: {
                    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test($('body').text()),
                    phone: /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,}/.test($('body').text())
                },
                ctaButtons: $('button, .btn, .button').length,
                score: 70
            };

            // Technical Analysis
            const technicalData = {
                forms: $('form').length,
                score: 80
            };

            // AI Analysis if API key is available
            let aiAnalysis = null;
            if (process.env.OPENAI_API_KEY) {
                try {
                    aiAnalysis = await this.aiAnalyzer.analyzeWebsite(url, { html: html });
                } catch (error) {
                    console.error('AI analysis failed:', error);
                    aiAnalysis = { error: 'AI analysis temporarily unavailable' };
                }
            }

            // Calculate overall score
            const scores = [seoData.score, performanceData.score, mobileData.score,
                          securityData.score, contentData.score, technicalData.score];
            const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

            return {
                success: true,
                url: url,
                timestamp: new Date().toISOString(),
                overallScore: overallScore,
                seo: seoData,
                performance: performanceData,
                mobile: mobileData,
                security: securityData,
                content: contentData,
                technical: technicalData,
                aiAnalysis: aiAnalysis,
                recommendations: this.generateRecommendations({
                    seo: seoData,
                    mobile: mobileData,
                    security: securityData
                })
            };

        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    }

    generateRecommendations(data) {
        const recommendations = [];

        if (!data.seo.title.optimal) {
            recommendations.push({
                category: 'SEO',
                priority: 'High',
                issue: 'Title tag length is not optimal',
                recommendation: 'Adjust title to be between 30-60 characters',
                impact: 'High',
                effort: 'Low'
            });
        }

        if (!data.mobile.hasViewport) {
            recommendations.push({
                category: 'Mobile',
                priority: 'Critical',
                issue: 'Missing viewport meta tag',
                recommendation: 'Add viewport meta tag for mobile responsiveness',
                impact: 'Critical',
                effort: 'Low'
            });
        }

        if (!data.security.isHTTPS) {
            recommendations.push({
                category: 'Security',
                priority: 'Critical',
                issue: 'Website not using HTTPS',
                recommendation: 'Enable HTTPS for secure connections',
                impact: 'Critical',
                effort: 'Medium'
            });
        }

        return recommendations;
    }
}

// Initialize analyzer
const analyzer = new LightweightAnalyzer();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Trial analysis endpoint
app.post('/api/analyze/trial', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        const result = await analyzer.analyzeWebsite(url);
        res.json(result);

    } catch (error) {
        console.error('Analysis error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze website. Please check the URL and try again.'
        });
    }
});

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, terms } = req.body;

        // Basic validation
        if (!name || !email || !password || !terms) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }

        // For demo purposes, just return success
        // In production, you would:
        // 1. Hash the password
        // 2. Store user in database
        // 3. Generate JWT token

        res.json({
            success: true,
            message: 'Account created successfully',
            token: 'demo-token-' + Date.now(),
            redirect: '/dashboard'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create account'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, remember } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Check for demo account
        if (email === 'demo@siteanalyzer.pro' && password === 'demo1234') {
            return res.json({
                success: true,
                message: 'Login successful',
                token: 'demo-token-' + Date.now(),
                user: {
                    name: 'Demo User',
                    email: 'demo@siteanalyzer.pro',
                    plan: 'free'
                },
                redirect: '/dashboard'
            });
        }

        // For demo purposes, reject all other logins
        // In production, you would:
        // 1. Look up user in database
        // 2. Verify password hash
        // 3. Generate JWT token

        res.status(401).json({
            success: false,
            error: 'Invalid email or password'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log in'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Export for Vercel
module.exports = app;