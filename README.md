# LinkedIn Automation & Content Generation MCP Server 🚀

A comprehensive **AI-powered LinkedIn automation platform** built on the Model Context Protocol (MCP) architecture. This sophisticated system combines advanced AI content generation, browser automation, and business intelligence extraction to provide a complete LinkedIn automation suite for content creators, marketers, sales professionals, and business development teams.

## 🌟 Key Features

### 🤖 AI-Powered Content Generation
- **Smart Content Creation**: Generate viral LinkedIn posts using Google Gemini AI
- **Topic Research**: Analyze existing LinkedIn content for trending topics and insights
- **Engagement Optimization**: Create posts optimized for maximum engagement and reach
- **Content Strategy**: Professional storytelling frameworks and thought leadership positioning

### 📊 Business Intelligence & Analytics
- **🏢 Company Analysis**: Extract comprehensive employee data from LinkedIn companies
- **👤 Profile Intelligence**: Deep profile data extraction with AI-powered insights
- **📈 Market Research**: Competitive analysis and industry intelligence gathering
- **🎯 Lead Generation**: Automated prospect identification and data collection

### 🤝 Sales & Networking Automation
- **🔗 Connection Automation**: Send personalized connection requests at scale
- **� AI Personalization**: Generate custom messages based on profile analysis
- **📱 Outreach Management**: Streamlined LinkedIn outreach workflows
- **🎯 Targeted Networking**: Strategic connection building based on company and role targeting

### 🛠️ Technical & Operational
- **⚡ Health Monitoring**: Comprehensive server health checks and status monitoring
- **� Multi-Deployment**: MCP server, standalone, and cloud deployment options
- **🐳 Docker Ready**: Complete containerization for cloud deployment
- **🔒 Session Management**: Persistent LinkedIn authentication and state management

## 🚀 Quick Start


## 🚀 Quick Start: LinkedIn MCP Automation Suite

This guide will help you set up and run the LinkedIn MCP (Model Context Protocol) automation server on your local machine. The instructions are designed for clarity and accuracy, with no exaggeration or unnecessary complexity.

---

### 1. Prerequisites

- **Python 3.11 or higher** must be installed.  
  [Download Python](https://www.python.org/downloads/)

- **Google Gemini API key** (for AI-powered features).  
  [Get your API key here](https://aistudio.google.com/app/apikey)

- **LinkedIn account credentials** (automation works best with a dedicated account).

- **Google Chrome or Chromium browser** (required for browser automation).

---

### 2. Clone the Repository

Open a terminal and run:

```powershell
git clone <your-repository-url>
cd linkedin_mcp_python
```

---

### 3. Install Python Dependencies

Install all required packages using pip:

```powershell
pip install -r requirements.txt
```

---

### 4. Set Up Environment Variables

Create a `.env` file in the root directory with the following content:

```env
LINKEDIN_USERNAME=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password
GOOGLE_API_KEY=your_gemini_api_key_here
```

- Do **not** share your `.env` file publicly.
- These credentials are required for all LinkedIn and AI-powered features.

---

### 5. Install Playwright Browser

Install the Chromium browser for Playwright automation:

```powershell
playwright install chromium
```

---

### 6. Start the MCP Server

You can run the server in two ways:

**A. Standard MCP Server (for local use or with MCP clients):**

```powershell
python src/server.py
```

**B. Uvicorn Server (for advanced or cloud use):**

```powershell
python src/main.py
```

---

### 7. Using the Tools

You can access the automation tools in three ways:

- **Via an MCP client** (such as Claude Desktop):  
  Connect to the running server and invoke tools like `generate_linkedin_content`, `extract_linkedin_profile_data`, `extract_company_employees`, `send_connection_request`, and `scrape_linkedin_post`.

- **Direct script execution:**  
  For quick content generation, run:
  ```powershell
  python PostLinkedin.py
  ```

- **API endpoint (if using Uvicorn):**  
  Advanced users can integrate with the HTTP API.

---

### 8. Project Structure Overview

- `src/server.py` – Main MCP server entry point; registers all automation tools.
- `src/main.py` – Alternative entry point using Uvicorn.
- `src/tools/` – Contains all core automation modules:
  - `generate_linkedin_content.py` – AI-powered post generation.
  - `extract_linkedin_profile_data.py` – Profile data extraction.
  - `extract_company_employees.py` – Company employee mapping.
  - `send_connection_request.py` – Automated connection requests.
  - `scrape_linkedin_post.py` – Post/comment scraping.
  - `linkedin_login.py` – Centralized authentication/session management.
  - `health_check.py` – Server health check endpoint.
- `PostLinkedin.py` – Standalone script for content generation.
- `requirements.txt` – Python dependencies.

---

### 9. Notes & Best Practices

- **Session Persistence:**  
  The system saves your LinkedIn login session to `linkedin-state.json` for faster, less intrusive automation.

- **Security:**  
  All credentials are managed via environment variables. Do not commit your `.env` file.

- **Compliance:**  
  Use a dedicated LinkedIn account for automation. Respect LinkedIn’s terms of service.

---

### 10. Troubleshooting

- If you see login errors, double-check your credentials in `.env`.
- If Playwright fails, ensure Chromium is installed (`playwright install chromium`).
- For AI errors, verify your Google Gemini API key and internet connection.

---


---

### 11. Connecting MCP to Claude Desktop

To use the LinkedIn MCP server with Claude Desktop (or any MCP-compatible client):

1. **Start the MCP server** (see step 6 above).

2. **Configure Claude Desktop** to recognize your local MCP server:

   - Open the Claude Desktop settings or configuration file (usually `settings.json` or similar).

   - Add or update the `mcpServers` section as follows (adjust the `args` path to match the location of `src/server.py` on your system):

   ```json
   {
     "mcpServers": {
       "linkedin-mcp": {
         "command": "python",
         "args": ["/absolute/path/to/src/server.py"],
         "env": {
           "LINKEDIN_USERNAME": "your_linkedin_email@example.com",
           "LINKEDIN_PASSWORD": "your_linkedin_password",
           "GOOGLE_API_KEY": "your_gemini_api_key_here"
         }
       }
     }
   }
   ```

   - The `command` and `args` fields must point to the correct Python executable and the full path to `src/server.py` on your machine. For example, if your project is in `D:/CashRich/2025/LinkedIN/comments/comments_mcp/linkedin_mcp_python/`, then use:

     ```json
     "args": ["D:/CashRich/2025/LinkedIN/comments/comments_mcp/linkedin_mcp_python/src/server.py"]
     ```

   - Use your actual credentials and API key (never share these publicly).

3. **Restart Claude Desktop**. The LinkedIn MCP tools will now appear as available actions or plugins.

4. **Invoke tools** like `generate_linkedin_content`, `extract_linkedin_profile_data`, etc., directly from Claude Desktop's interface.

---

For questions or issues, please open a GitHub issue or contact the project maintainer.
