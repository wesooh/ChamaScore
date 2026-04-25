<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

Chamas and side-hustles in Kenya lack access to formal credit scoring. Banks reject informal groups. **ChamaScore** solves this by using alternative data (M-Pesa SMS, transaction records, group contributions) to predict creditworthiness with Google's Gemini AI.

## Features

- 📱 **Input M-Pesa SMS** - Paste transaction history
- 👥 **Chama Records** - Upload contribution logs
- 🤖 **Gemini AI Scoring** - 0-100 credit score with reasoning
- 🗣️ **Swahili/English Explanations** - "Anaweza kupata loan", "Risk iko juu"
- 📊 **Analysis History** - Save and track past evaluations
- 📤 **CSV Export** - Download data for record-keeping

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **AI**: Google Gemini API (Pro model)
- **Deployment**: Google Cloud Run (buildathon requirement)
- **Storage**: LocalStorage for history
- **Version Control**: GitHub

## Setup Instructions

### Prerequisites
- Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com/))
- Google Cloud account (for deployment)

### Local Development

1. Clone the repository
```bash
git clone https://github.com/wesooh/ChamaScore.git
cd ChamaScore
# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://chama-score-p1c6yvj9r-wesleys-projects-2a2d1438.vercel.app/

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
