const OpenAI = require('openai');
const cheerio = require('cheerio');

class AIWebsiteAnalyzer {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY
        });

        // Core analysis prompts that differentiate us
        this.analysisPrompts = {
            headline: {
                system: `You are a world-class conversion copywriter who has increased conversions by 300%+ for Fortune 500 companies.
                Your expertise comes from analyzing 10,000+ websites and A/B testing thousands of headlines.
                You understand psychological triggers, urgency, clarity, and value proposition better than anyone.`,

                user: (content) => `Analyze this website's headline and hero section:
                "${content}"

                Provide:
                1. CONVERSION SCORE (0-100): Rate the headline's ability to convert visitors
                2. PSYCHOLOGICAL TRIGGERS: What emotions/desires does it tap into (or miss)?
                3. CLARITY SCORE (0-100): How clear is the value proposition?
                4. THE REWRITE: Provide 2 high-converting alternatives with explanation
                5. EXPECTED LIFT: % improvement you'd expect from the rewrite

                Format as actionable insights, not generic advice.`
            },

            cta: {
                system: `You are a CTA optimization specialist who has generated millions in revenue through button copy alone.
                You've tested every variation: color, size, position, microcopy, urgency triggers.
                You know exactly what makes people click and what creates friction.`,

                user: (buttons) => `Analyze these CTAs found on the website:
                ${buttons}

                Provide:
                1. CLICK PROBABILITY (0-100): How likely is a motivated visitor to click?
                2. FRICTION POINTS: What psychological barriers exist?
                3. URGENCY ANALYSIS: Is there appropriate urgency/scarcity?
                4. THE FIX: Exact CTA copy that would convert 2-3x better
                5. PLACEMENT CRITIQUE: Are they positioned optimally?

                Give specific rewrites, not general principles.`
            },

            trust: {
                system: `You are a trust & credibility expert who helps companies reduce bounce rates by 60%.
                You understand trust signals, social proof, authority markers, and credibility indicators.
                You know exactly what makes visitors trust a site in the first 3 seconds.`,

                user: (content) => `Analyze trust elements on this website:
                ${content}

                Provide:
                1. TRUST SCORE (0-100): How trustworthy does this site appear?
                2. MISSING SIGNALS: What trust elements are critically missing?
                3. RED FLAGS: What might make visitors suspicious?
                4. QUICK WINS: 3 trust elements to add TODAY for immediate impact
                5. SOCIAL PROOF AUDIT: How well is social proof utilized?

                Be specific about implementation, not theoretical.`
            },

            copy: {
                system: `You are a direct response copywriter trained by the legends: Gary Halbert, Eugene Schwartz, Claude Hopkins.
                You've written copy that has sold $100M+ in products. You understand features vs benefits, emotional triggers,
                and the exact words that make people buy. You can spot weak copy instantly.`,

                user: (copy) => `Analyze this website copy:
                ${copy}

                Provide:
                1. PERSUASION SCORE (0-100): How compelling is this copy?
                2. BENEFITS VS FEATURES: Are they selling benefits or just listing features?
                3. EMOTIONAL TRIGGERS: What emotions should be triggered but aren't?
                4. POWER WORDS MISSING: What high-converting words should be added?
                5. THE REWRITE: Provide 2 paragraphs of high-converting copy
                6. READABILITY: Is it scannable? Grade level appropriate?

                Give exact copy rewrites they can copy-paste.`
            },

            mobile: {
                system: `You are a mobile UX expert who knows that 70% of traffic is mobile.
                You've optimized hundreds of sites for mobile conversion, understanding thumb reach,
                scroll depth, load times, and mobile-specific behaviors.`,

                user: (analysis) => `Based on this mobile analysis:
                ${analysis}

                Provide:
                1. MOBILE SCORE (0-100): How well optimized for mobile conversion?
                2. THUMB ZONE ANALYSIS: Are CTAs in easy thumb reach?
                3. LOAD TIME IMPACT: How is speed affecting mobile conversions?
                4. CRITICAL FIXES: Top 3 mobile issues killing conversions
                5. QUICK WINS: Changes that take <1 hour but boost mobile conversions 20%+`
            },

            value: {
                system: `You are a value proposition expert who has helped 500+ startups find product-market fit.
                You understand how to communicate value instantly, differentiate from competitors,
                and make the offering irresistible. You know what makes people say "I need this NOW!"`,

                user: (content) => `Analyze the value proposition on this website:
                ${content}

                Provide:
                1. VALUE CLARITY (0-100): How clear is what you're offering?
                2. DIFFERENTIATION SCORE: What makes this unique? (Or doesn't?)
                3. THE 5-SECOND TEST: What would a visitor understand in 5 seconds?
                4. COMPETITOR ADVANTAGE: How does this compare to alternatives?
                5. THE PERFECT PITCH: Rewrite their value prop in 15 words or less
                6. URGENCY CREATION: How to make visitors act NOW, not later

                Make it so compelling they'd be stupid NOT to buy.`
            },

            overall: {
                system: `You are the world's top website conversion consultant, charging $50,000 for audits.
                You've analyzed sites for Amazon, Apple, and countless unicorn startups.
                You see patterns others miss and know exactly what separates 2% conversion from 20%.
                Your recommendations have generated billions in additional revenue.`,

                user: (fullAnalysis) => `Based on this complete website analysis:
                ${fullAnalysis}

                Provide THE ULTIMATE CONVERSION ROADMAP:

                1. OVERALL CONVERSION SCORE (0-100): Current conversion potential
                2. THE #1 BOTTLENECK: The ONE thing killing conversions most
                3. THE 3-DAY PLAN: What to fix in 3 days for 50%+ conversion lift
                4. THE 30-DAY PLAN: Complete optimization for 200%+ lift
                5. EXPECTED RESULTS: Specific % improvements for each change
                6. COMPETITOR CRUSHING: How to dominate your market
                7. THE MONEY LINE: One sentence they should add that will make them millions

                Be brutally honest. Give them the $50,000 advice for free.
                Make your advice so good they'll tell everyone about this tool.`
            }
        };
    }

    async analyzeWebsite(url, websiteContent) {
        const $ = cheerio.load(websiteContent.html);

        // Extract key elements
        const headline = $('h1').first().text() || $('h2').first().text();
        const subheadline = $('h2').first().text() || $('h3').first().text();
        const ctaButtons = [];
        $('button, a.btn, a.button, [class*="cta"], [class*="button"]').each((i, el) => {
            if (i < 5) ctaButtons.push($(el).text().trim());
        });

        const bodyText = $('p').slice(0, 5).map((i, el) => $(el).text()).get().join(' ');
        const hasTestimonials = $('[class*="testimonial"], [class*="review"]').length > 0;
        const hasTrustBadges = $('[class*="trust"], [class*="secure"], [class*="guarantee"]').length > 0;
        const hasVideo = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;

        // Run parallel AI analyses
        const analyses = await Promise.all([
            this.analyzeHeadline(headline + ' ' + subheadline),
            this.analyzeCTAs(ctaButtons.join(', ')),
            this.analyzeTrust(`Testimonials: ${hasTestimonials}, Trust badges: ${hasTrustBadges}, Video: ${hasVideo}`),
            this.analyzeCopy(bodyText),
            this.analyzeValue(headline + ' ' + bodyText)
        ]);

        // Generate overall recommendations
        const overallAnalysis = await this.generateOverallAnalysis({
            headline: analyses[0],
            ctas: analyses[1],
            trust: analyses[2],
            copy: analyses[3],
            value: analyses[4],
            url: url
        });

        return {
            url: url,
            timestamp: new Date().toISOString(),
            scores: {
                headline: this.extractScore(analyses[0]),
                cta: this.extractScore(analyses[1]),
                trust: this.extractScore(analyses[2]),
                copy: this.extractScore(analyses[3]),
                value: this.extractScore(analyses[4]),
                overall: this.extractScore(overallAnalysis)
            },
            analysis: {
                headline: analyses[0],
                cta: analyses[1],
                trust: analyses[2],
                copy: analyses[3],
                value: analyses[4]
            },
            recommendations: overallAnalysis,
            quickWins: this.extractQuickWins(analyses),
            priorityActions: this.extractPriorityActions(overallAnalysis)
        };
    }

    async analyzeHeadline(content) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: this.analysisPrompts.headline.system },
                { role: "user", content: this.analysisPrompts.headline.user(content) }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        return response.choices[0].message.content;
    }

    async analyzeCTAs(buttons) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: this.analysisPrompts.cta.system },
                { role: "user", content: this.analysisPrompts.cta.user(buttons) }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        return response.choices[0].message.content;
    }

    async analyzeTrust(content) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: this.analysisPrompts.trust.system },
                { role: "user", content: this.analysisPrompts.trust.user(content) }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        return response.choices[0].message.content;
    }

    async analyzeCopy(copy) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: this.analysisPrompts.copy.system },
                { role: "user", content: this.analysisPrompts.copy.user(copy) }
            ],
            temperature: 0.7,
            max_tokens: 600
        });
        return response.choices[0].message.content;
    }

    async analyzeValue(content) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: this.analysisPrompts.value.system },
                { role: "user", content: this.analysisPrompts.value.user(content) }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        return response.choices[0].message.content;
    }

    async generateOverallAnalysis(allAnalyses) {
        const fullAnalysis = JSON.stringify(allAnalyses, null, 2);
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: this.analysisPrompts.overall.system },
                { role: "user", content: this.analysisPrompts.overall.user(fullAnalysis) }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        return response.choices[0].message.content;
    }

    extractScore(analysis) {
        const scoreMatch = analysis.match(/(?:SCORE|Score)[:\s]*(\d+)/);
        return scoreMatch ? parseInt(scoreMatch[1]) : null;
    }

    extractQuickWins(analyses) {
        const quickWins = [];
        analyses.forEach(analysis => {
            const wins = analysis.match(/QUICK WINS?:([^]*?)(?:\n\n|\n[A-Z]|$)/i);
            if (wins) {
                quickWins.push(wins[1].trim());
            }
        });
        return quickWins;
    }

    extractPriorityActions(overallAnalysis) {
        const priorities = [];
        const matches = overallAnalysis.match(/(?:#1|TOP|CRITICAL|PRIORITY)[^]*?(?:\n\n|\n[A-Z]|$)/gi);
        if (matches) {
            matches.forEach(match => {
                priorities.push(match.trim());
            });
        }
        return priorities.slice(0, 3);
    }
}

module.exports = AIWebsiteAnalyzer;