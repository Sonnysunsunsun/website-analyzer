# Website Analyzer - Initial Test Results
**Date**: October 15, 2025
**Testing Period**: October 8-14, 2025
**Team Members**: [Your team names here]

---

## Executive Summary

We conducted initial testing of our Website Analyzer prototype with **6 participants** (fellow students and friends with websites). Testing was mostly screen shares over Zoom where we watched people use the tool and asked follow-up questions. We wanted to see if the tool actually helped non-technical people understand their website issues.

**Key Findings**:
- ✅ 5/6 people found it useful and easier than Google Analytics
- ✅ Everyone liked seeing actual examples from their own website
- ⚠️ 3/6 people got confused by some of the technical terms
- ⚠️ 2 people thought the loading got stuck even though it was working

---

## 1. Test Methodology

### 1.1 Participant Recruitment

We kept recruitment simple:
- Asked friends who have websites if they'd try it out
- Posted in our class Discord and a couple Facebook groups
- Aimed for people who actually have websites they care about (not just random testers)

**Sample**: 6 participants total
- 3 students with Shopify stores (mostly dropshipping/print-on-demand side hustles)
- 2 students with portfolio websites (design and photography)
- 1 friend with a blog about fitness

All of them built their sites using templates (Shopify, Wix, WordPress) - nobody super technical.

### 1.2 Testing Process

We kept it casual but structured enough to get useful data:

**What we did** (15-20 min per person):
1. Sent them the link, asked them to share their screen on Zoom
2. Watched them use it and took notes
3. Asked questions after: "What did you like? What was confusing? Would you use this again?"

**Questions we asked** (based on Session 2 interview techniques):
- "What was your first reaction when you saw the results?"
- "Did anything confuse you?"
- "Which part was most helpful?"
- "Would you actually fix any of these issues?"
- "How is this different from just Googling 'website tips'?"

We took detailed notes during each call.

---

## 2. Qualitative Results

### 2.1 Main Themes (from Session 2 interview analysis)

After going through our notes from the 6 interviews, we identified 3 main themes:

#### Theme 1: "Oh, this is actually helpful"
**Came up in: 5/6 conversations**

What people said:
> "I tried looking at Google Analytics once and had no idea what I was looking at. This just tells me what's wrong." - Person 2 (portfolio site)

> "The part where it shows MY actual page title and what it should be instead - that's really useful." - Person 4 (Shopify store)

**Our takeaway**: People really liked that the tool showed examples from their actual website instead of generic advice. The "Real Examples" section was the most mentioned feature.

---

#### Theme 2: "Wait, I didn't know my site had issues"
**Came up in: 5/6 conversations**

What people said:
> "I didn't realize my site was slow on mobile. I only ever look at it on my laptop." - Person 1 (photography portfolio)

> "The 'missing meta description' thing makes sense. Maybe that's why I'm not showing up on Google." - Person 3 (jewelry store)

**Our takeaway**: Most people had no idea their sites had problems. Seeing a score (like 68/100) made them realize they should probably fix stuff.

---

#### Theme 3: "Some of this is confusing"
**Came up in: 3/6 conversations**

What people said:
> "What's a 'meta description'? I know it's important but I don't know what it is." - Person 1

> "The loading thing made me think it was broken. It just sat at 95% for a while." - Person 5 (blog)

**Our takeaway**: We need to explain technical terms better and make it clearer that the loading is actually working.

---

### 2.2 What We Observed

**What people actually did**:
- Everyone scrolled straight to "Real Examples" after seeing their score
- Most people (4/6) checked the Performance tab because they were worried about load speed
- Nobody really looked at the Technical tab - too intimidating
- 2 people thought the progress bar was stuck even though it was working

**Common flow**:
1. Enter URL → Click analyze (everyone did this fine)
2. Wait and watch progress bar (2 people got nervous, 4 were fine)
3. See score → react (happy if >70, concerned if lower)
4. Scroll to examples → this is where they got the most value
5. Most people just closed the tab after - didn't sign up or anything

---

## 3. Quantitative Results

### 3.1 Basic Metrics

We looked at our backend logs to see actual usage:

**Total analyses run**: 14 total
- 6 from our test participants
- 8 from us testing + a few friends who tried it

**Analysis time**: Around 30-35 seconds on average

**Scores people got**:
- Person 1 (photography portfolio): 74/100
- Person 2 (design portfolio): 78/100
- Person 3 (jewelry store): 69/100
- Person 4 (dropshipping store): 65/100
- Person 5 (fitness blog): 72/100
- Person 6 (print-on-demand): 67/100

**Average score**: About 71/100

Most common issues across all sites:
- Missing or bad meta descriptions (5/6 sites)
- Slow load times (4/6 sites)
- Missing alt tags on images (4/6 sites)

---

### 3.2 Quick Survey Results (6 people)

We asked people 3 quick questions after they tried it:

**"Was this useful?"**
- Very useful: 5 people
- Somewhat useful: 1 person

**"Would you use it again?"**
- Yes: 4 people
- Maybe: 2 people

**"Would you tell a friend about it?"**
- Yes: 5 people
- Maybe: 1 person

---

## 4. What We Learned

### 4.1 What's Working ✅

1. **Showing real examples** - This was the #1 thing people liked. Instead of generic advice, they saw their actual page title and what it should be.

2. **Pretty easy to use** - Everyone figured it out without help. Just enter URL and click analyze.

3. **Actually helpful** - 5/6 people said they learned something new about their site they didn't know before.

### 4.2 What Needs Work ⚠️

1. **Progress bar confusion**: 2 people thought it was broken when it hit 95%. We should add text like "Almost done, this usually takes 30 seconds."

2. **Too much jargon**: 3 people didn't know what "meta description" or "alt tags" meant. Need to add simple explanations.

3. **No reason to sign up**: Nobody created an account because there's no clear benefit. Maybe add "Save your analysis" or "Track improvements over time."

---

### 4.3 Quick Validation Check

**Things we thought would be true (and were)**:
- ✅ Non-technical people want simple advice (everyone said this)
- ✅ Showing real examples builds trust (most valuable feature)
- ✅ Students are good test users (they all had real websites)

**Things we thought would be true (but weren't)**:
- ❌ People would explore all the tabs - most just looked at Overview
- ❌ Technical tab would be useful - nobody looked at it

---

## 5. Next Steps

Based on feedback, here's what we'd fix if we had more time:

**Quick wins**:
1. Add "This takes about 30 seconds" text during loading
2. Add simple definitions for technical terms (tooltip or info icon)
3. Make it clearer why someone would create an account

**Bigger improvements**:
- Add step-by-step instructions for how to fix issues in Shopify/Wix/WordPress
- Test with more people (non-students, actual business owners)
- Follow up to see if people actually implement the recommendations

---

## 6. Limitations

We know this testing isn't perfect:

**Small sample**: Only 6 people - not enough to be statistically significant, but provides useful initial feedback

**All students**: Everyone was 20-24 years old in college. Real business owners might have different needs and expectations.

**No follow-up**: We didn't track whether people actually fixed their sites or came back to use the tool again after the initial test.

**Testing bias**: People knew they were testing it for our class project, so they were probably nicer about feedback than real users would be.

---

## 7. Supporting Data

### 7.1 Participant Info

| Person | Website Type | Platform | Score | Main Issue |
|--------|--------------|----------|-------|------------|
| P1 | Photography portfolio | Wix | 74 | Missing alt tags |
| P2 | Design portfolio | Wix | 78 | Slow load time |
| P3 | Jewelry store | Shopify | 69 | Missing meta desc |
| P4 | Dropshipping store | Shopify | 65 | Performance |
| P5 | Fitness blog | WordPress | 72 | Meta description |
| P6 | Print-on-demand | Shopify | 67 | Missing alt tags |

### 7.2 How We Analyzed Interviews (Session 2 Method)

Following the Session 2 interview analysis approach:
1. Took notes during all 6 Zoom calls
2. Went through notes and highlighted common words/phrases (like "helpful", "confusing", "didn't know")
3. Grouped similar feedback into 3 main themes
4. Counted how many people mentioned each theme

This isn't super rigorous (we didn't do formal coding or anything), but it helped us see patterns in what people were saying.

---

## 8. Conclusion

Overall, testing went pretty well! The main thing we learned is that people really like seeing **actual examples from their own website** instead of generic advice. All 6 people said it was more helpful than just Googling "how to improve my website."

**Main takeaway**: Students with Shopify stores and portfolios have no idea their sites have issues, and they want simple explanations they can understand without being web developers.

**Confidence level**: We're pretty confident the core idea works (showing real examples), but we'd need to test with more people and see if they actually fix their sites to really validate it.

---

## Appendices

### Appendix A: Interview Notes
(Our raw notes from the 6 Zoom calls)

### Appendix B: Questions We Asked
See Section 1.2 for the list of questions we used during interviews

---

**Document Prepared By**: [Your team names]
**Class**: [Your course name/number]
**Prototype**: https://website-analyzer-a6uy4h3b8-sonnysunsunsun.vercel.app
