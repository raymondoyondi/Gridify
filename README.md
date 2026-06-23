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

## 📁 Repository Structure

```text
├── src/               # Frontend and Backend source files
├── .env.example       # Example environment variables template
├── .gitignore         # Git ignore file configuration
├── index.html         # Main entry point for the web dashboard
├── metadata.json      # Configuration or application metadata
├── package.json       # Project dependencies and scripts
├── server.ts          # Server-side entry point
├── tsconfig.json      # TypeScript compiler configuration
└── README.md          # Project documentation
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
