# Lumora — MSME Copilot 🚀

### AI-Powered Business Assistance for Micro, Small, and Medium Enterprises

Lumora is a web application designed to help small businesses manage business information and access useful insights through a modern, user-friendly interface.

## ✨ Features

- **Business Dashboard:** A central interface for business information and insights.
- **Business Events:** Backend integration for retrieving business event records.
- **Supabase Integration:** Database connectivity for storing and retrieving business data.
- **Secure API Access:** The business events endpoint validates Supabase authentication tokens.
- **Modern Web Interface:** Built using React, TypeScript, and Vite.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js
- **Database:** Supabase
- **Version Control:** Git and GitHub

## 📁 Project Structure


lumora-msme-copilot/
├── api/
├── public/
├── server/
├── src/
├── .gitignore
├── package.json
└── README.md


## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project with the required database configuration

### Installation

Clone the repository:


git clone https://github.com/fgafoor365-create/lumora-msme-copilot.git


Navigate into the project folder:


cd lumora-msme-copilot


Install dependencies:


npm install


### Environment Configuration

Create a local `.env` file and configure the environment variables required by the project.

**Important:** Never commit `.env` files, secret keys, or private credentials to GitHub.

### Run the Frontend


npm run dev


### Run the Backend

Open another terminal and run:


npm run server


The backend API runs locally at:


http://localhost:3001


## 🔐 Security

- Keep credentials and API secrets out of source control.
- Use authentication and appropriate database access policies.
- Keep Supabase Row Level Security (RLS) enabled where required.

## 🎯 Project Goal

Lumora aims to make business information and insights more accessible to MSMEs through a modern web application and backend data integration.

## 👩‍💻 Development

This project is under active development. Features and integrations may evolve as development progresses.
