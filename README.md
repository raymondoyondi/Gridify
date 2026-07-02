# Gridify

A smart web dashboard powered by GenAI that lets users use natural language to instantly generate custom charts, summaries, and layouts.

## 🚀 Features

- **Natural Language to Dashboard**: Type what you want to see, and watch the layout generate automatically.
- **AI-Powered Charts**: Dynamically creates data visualizations based on user prompts.
- **Smart Summaries**: Generates AI insights from your underlying data.
- **Custom Layouts**: Flexible grid system that adapts to your generated components.

## 🛠️ Tech Stack

- **Frontend**: HTML5, TypeScript, Tailwind CSS (implied by layout configuration)
- **Backend/Server**: TypeScript, Node.js (`server.ts`)
- **AI Integration**: Generative AI APIs (Configurable via `.env`)

## 📁 Project Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py              # Configuration settings
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── telemetry.py       # Telemetry endpoints
│   │   └── gemini.py          # Gemini AI endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   └── gemini_service.py  # Gemini API client
│   └── utils/
│       ├── __init__.py
│       ├── logger.py          # Logging setup
│       └── telemetry_data.py  # Default telemetry data
├── tests/
│   ├── __init__.py
│   ├── test_telemetry.py      # Telemetry tests
│   └── test_gemini.py         # Gemini integration tests
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose configuration
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org) (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd Gridify
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Duplicate the `.env.example` file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and fill in your GenAI API keys and other configuration variables.

### Running the Application

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   *(Note: Adjust this command if your `package.json` uses a different script like `npm start` or `ts-node server.ts`)*

2. **Open the app:**
   Open your browser and navigate to `http://localhost:3000` (or the port specified by your server).

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
