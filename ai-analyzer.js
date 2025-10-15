const OpenAI = require('openai');
const cheerio = require('cheerio');

class AIWebsiteAnalyzer {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY
        });
    }

    async analyzeWebsite(url, websiteContent) {
        console.log('=== AI WEBSITE ANALYZER STARTING ===');
        console.log('URL:', url);
        console.log('Has HTML content:', !!websiteContent.html);

        const $ = cheerio.load(websiteContent.html);

        // Extract key elements from the actual website
        const headline = $('h1').first().text().trim() || $('h2').first().text().trim() || 'No headline found';
        const subheadline = $('h2').first().text().trim() || $('h3').first().text().trim() || '';

        const ctaButtons = [];
        $('button, a.btn, a.button, [class*="cta"], [class*="button"]').each((i, el) => {
            if (i < 5) {
                const text = $(el).text().trim();
                if (text) ctaButtons.push(text);
            }
        });

        const bodyText = $('p').slice(0, 10).map((i, el) => $(el).text().trim()).get().join(' ').substring(0, 2000);

        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const title = $('title').text() || '';

        const hasTestimonials = $('[class*="testimonial"], [class*="review"], [class*="feedback"]').length > 0;
        const hasTrustBadges = $('[class*="trust"], [class*="secure"], [class*="guarantee"], [class*="certified"]').length > 0;
        const hasVideo = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;
        const socialProof = $('[class*="customer"], [class*="client"], [class*="user"]').text().substring(0, 500);

        console.log('Extracted data:');
        console.log('- Headline:', headline.substring(0, 100));
        console.log('- CTAs found:', ctaButtons.length);
        console.log('- Body text length:', bodyText.length);
        console.log('- Has testimonials:', hasTestimonials);

        // ULTRA-DETAILED SYSTEM PROMPT - This is the core value driver
        const systemPrompt = `You are an elite $50,000/audit conversion optimization consultant who has increased client revenues by over $2 billion.

YOUR EXPERTISE:
- Analyzed 10,000+ websites for companies like Amazon, Airbnb, Shopify
- A/B tested thousands of headlines, CTAs, and page layouts
- Deep understanding of psychology, persuasion, and consumer behavior
- Expert in copywriting, UX, and conversion rate optimization

ANALYSIS FRAMEWORK:

1. HEADLINE & VALUE PROPOSITION ANALYSIS (Critical):
   - Does the headline immediately communicate WHAT they offer?
   - Does it tap into desires (make money, save time, look good, feel confident)?
   - Is it specific or generic? ("Professional Web Design" = boring vs "Websites That Convert at 23%+ Higher Rates" = compelling)
   - Clarity score: Can a 10-year-old understand what you do in 5 seconds?
   - Urgency: Does it create FOMO or reason to act now?

2. CALL-TO-ACTION OPTIMIZATION (High Impact):
   - Button copy: Does it tell them exactly what happens next?
   - "Submit" = BAD (vague, commitment) | "Get My Free Quote" = GOOD (specific, benefit-driven)
   - Color psychology: Does button stand out without being garish?
   - Placement: Above fold? Repeated throughout page?
   - Friction: Does it ask for too much info too soon?

3. TRUST & CREDIBILITY SIGNALS (Essential for Conversions):
   - Social proof: Customer count, testimonials, reviews, ratings
   - Authority markers: Awards, certifications, press mentions, "As Seen On"
   - Risk reversal: Money-back guarantee, free trial, no credit card required
   - Specific numbers: "Join 47,382 happy customers" beats "Join thousands"

4. COPY & MESSAGING QUALITY (Make or Break):
   - Benefits vs Features: "Save 10 hours/week" vs "Automated scheduling"
   - Emotional triggers: Fear, greed, vanity, sloth (7 deadly sins sell!)
   - Specificity: "$47/month" beats "affordable" | "3.4% average return" beats "great returns"
   - Readability: Short sentences, bullet points, scannable
   - Voice: Confident authority or desperate salesperson?

5. CONVERSION PSYCHOLOGY:
   - Scarcity: "Only 3 spots left" or "Ends Friday"
   - Social proof: "Join 10,000+ users"
   - Authority: Expert positioning, credentials
   - Reciprocity: Give value before asking
   - Commitment: Small yes leads to big yes

CRITICAL SUCCESS FACTORS:
- BE BRUTALLY SPECIFIC: Not "improve CTA" but "Change 'Submit' to 'Get My Free Analysis in 90 Seconds'"
- QUANTIFY IMPACT: Always give % improvement estimates based on industry data
- PRIORITIZE BY ROI: Quick wins first, then bigger changes
- REAL EXAMPLES: Reference the ACTUAL content you see, not generic advice
- BE HONEST: If something is terrible, say so (constructively)

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON, no extra text
- Be specific about THIS website, not generic
- Give exact copy recommendations they can copy-paste
- Estimate conversion lift for each change
- Focus on money-making improvements, not just "best practices"`;

        const userPrompt = `Analyze this website and provide ultra-specific, money-making recommendations.

WEBSITE URL: ${url}

ACTUAL CONTENT FROM THE SITE:
- Page Title: "${title}"
- Meta Description: "${metaDescription}"
- Main Headline (H1): "${headline}"
- Subheadline: "${subheadline}"
- Call-to-Action Buttons: ${ctaButtons.length > 0 ? ctaButtons.map(cta => `"${cta}"`).join(', ') : 'None found'}
- Body Copy Sample: "${bodyText.substring(0, 500)}..."
- Has Testimonials: ${hasTestimonials ? 'Yes' : 'No'}
- Has Trust Badges: ${hasTrustBadges ? 'Yes' : 'No'}
- Has Video: ${hasVideo ? 'Yes' : 'No'}
- Social Proof Text: "${socialProof}"

Return ONLY valid JSON in this EXACT structure:

{
  "overallConversionScore": [0-100 - honest assessment of current conversion potential],
  "headline": {
    "current": "[Exact headline from the site]",
    "score": [0-100],
    "issues": [
      "[Specific problem 1]",
      "[Specific problem 2]"
    ],
    "rewrite1": "[First alternative - benefit-driven]",
    "rewrite2": "[Second alternative - urgency-focused]",
    "rationale": "[WHY these work better - psychology/data]",
    "expectedLift": "[e.g., '+15-25% CTR improvement']"
  },
  "valueProposition": {
    "clarity": [0-100 - can visitor understand what you do in 5 seconds?],
    "differentiation": [0-100 - is it unique or generic?],
    "current": "[What the site currently communicates]",
    "improved": "[Clearer, more compelling version]",
    "keyMessage": "[The ONE thing they should communicate]"
  },
  "callsToAction": {
    "score": [0-100],
    "currentCTAs": [
      "[Exact CTA button text 1]",
      "[Exact CTA button text 2]"
    ],
    "issues": [
      "[Problem with current CTAs]"
    ],
    "recommendations": [
      {
        "current": "[Exact current CTA]",
        "improved": "[Better version]",
        "reason": "[Why it's better]",
        "expectedLift": "[e.g., '+20-30% click rate']"
      }
    ]
  },
  "trustSignals": {
    "score": [0-100],
    "existing": [
      "[What trust elements they have]"
    ],
    "missing": [
      "[Critical trust elements to add]"
    ],
    "quickWins": [
      {
        "add": "[Specific trust element to add]",
        "where": "[Where to place it]",
        "impact": "[Expected conversion lift]"
      }
    ]
  },
  "copyQuality": {
    "score": [0-100],
    "strengths": [
      "[What's working well in their copy]"
    ],
    "weaknesses": [
      "[What's not working - be specific]"
    ],
    "rewrite": {
      "section": "[Which section to rewrite]",
      "current": "[Their current copy]",
      "improved": "[Your improved version - make it compelling!]",
      "why": "[Explanation of changes]"
    }
  },
  "conversionBottlenecks": [
    {
      "issue": "[Specific problem hurting conversions]",
      "severity": "CRITICAL|HIGH|MEDIUM",
      "location": "[Where on the page]",
      "fix": "[Exact fix with copy if applicable]",
      "impactEstimate": "[e.g., '+25-40% improvement']",
      "effortLevel": "LOW|MEDIUM|HIGH"
    }
  ],
  "quickWins": [
    {
      "change": "[Specific action they can take today]",
      "where": "[Location/element]",
      "expectedImpact": "[Conversion % increase]",
      "implementation": "[Step-by-step how to do it]"
    }
  ],
  "thirtyDayRoadmap": {
    "week1": [
      "[Action item 1]",
      "[Action item 2]"
    ],
    "week2": [
      "[Action item 1]",
      "[Action item 2]"
    ],
    "week3-4": [
      "[Action item 1]",
      "[Action item 2]"
    ],
    "expectedTotalLift": "[e.g., '+50-100% conversion rate improvement']"
  },
  "competitiveAdvantage": {
    "currentPositioning": "[How they currently position themselves]",
    "suggestedAngle": "[Unique angle they should take]",
    "differentiators": [
      "[What makes them special or could make them special]"
    ]
  },
  "urgencyAndScarcity": {
    "currentLevel": [0-100],
    "recommendations": [
      "[Specific urgency tactic to add]"
    ]
  },
  "oneLiner": "[The single most impactful change that would drive the biggest conversion increase - be ULTRA specific]"
}

CRITICAL RULES:
1. Analyze the ACTUAL content provided, not generic advice
2. Give SPECIFIC copy rewrites they can use
3. Estimate conversion lift for each recommendation
4. Prioritize changes by ROI (quick wins first)
5. Be honest but constructive if something is bad
6. Reference real psychological principles and A/B test data
7. Focus on MONEY-MAKING changes, not just "best practices"

Remember: This analysis directly impacts their revenue. Make it worth $50,000.`;

        try {
            console.log('Calling OpenAI API...');
            const response = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 3000,
                response_format: { type: "json_object" }
            });

            console.log('OpenAI response received');
            const analysisText = response.choices[0].message.content;
            console.log('Response length:', analysisText.length);

            let analysis;
            try {
                analysis = JSON.parse(analysisText);
                console.log('Successfully parsed JSON analysis');
                console.log('Overall score:', analysis.overallConversionScore);
            } catch (parseError) {
                console.error('Failed to parse OpenAI JSON:', parseError);
                console.error('Raw response:', analysisText.substring(0, 500));
                throw new Error('Invalid JSON from OpenAI');
            }

            // Add metadata
            analysis.url = url;
            analysis.timestamp = new Date().toISOString();
            analysis.model = "gpt-4-turbo-preview";

            console.log('=== AI ANALYSIS COMPLETE ===');
            return analysis;

        } catch (error) {
            console.error('=== AI ANALYZER ERROR ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);

            // Return error object instead of throwing
            return {
                error: true,
                message: 'AI analysis temporarily unavailable',
                details: error.message,
                url: url,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = AIWebsiteAnalyzer;
