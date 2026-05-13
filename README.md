# 🏢 BU Dorms

**Your Soft & Smart Companion**

BU Dorms is a high-performance RAG (Retrieval-Augmented Generation) chatbot wrapped in a squishy, friendly, and accessible interface. It allows you to talk to your documents effortlessly, completely removing the anxiety of using complex AI tools.

## ✨ Features

- 🤖 **Chat with Documents:** Upload and interact with your files using advanced RAG technology.
- 🔐 **Secure Authentication:** Integrated authentication flows managed seamlessly by Supabase.
- 📱 **Responsive Design:** Optimized for both desktop and mobile experiences (includes dynamic sidebars and mobile top bars).
- 🎨 **Charming Animations:** Features smooth, delightful UI animations powered by Rive.
- ⚡ **Modern Stack:** Built on the robust foundations of Next.js (App Router), React, and Tailwind CSS.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Auth:** [Supabase](https://supabase.com/)
- **Animations:** [Rive](https://rive.app/)

## 🏗️ Data Pipeline
ก่อนที่จะเริ่มใช้งาน Chatbot ข้อมูลหอพักจะถูกจัดเตรียมผ่านกระบวนการดังนี้:

Web Scraping: ดึงข้อมูลหอพักจากเว็บไซต์แหล่งที่มา (เช่น RentHub) โดยอัตโนมัติ เพื่อรวบรวมรายละเอียด ชื่อหอพัก ราคา สิ่งอำนวยความสะดวก และที่อยู่

🔗 Google Colab: [Web Scraping Step](https://colab.research.google.com/drive/10suHx7CTBzNjTbUrV6ddgpxyhC9Phvm5?usp=sharing)

Data Prep & Embedding: นำข้อมูลที่ Scrap มาได้มาทำความสะอาด (Cleaning) และจัดการโครงสร้างข้อมูล จากนั้นนำไปผ่านโมเดลเพื่อสร้าง Vector Embeddings และจัดเก็บลงในฐานข้อมูล Supabase เพื่อใช้ในการค้นหาแบบ Semantic Search

🔗 Google Colab: [Prepare data + Embedding](https://colab.research.google.com/drive/14XFtt6YrQS_QyupByA7kcUiuZneOwt6N?usp=sharing)

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Version 20 or higher recommended)
- `npm`, `yarn`, or `pnpm` (Package manager)
- A [Supabase](https://supabase.com/) account and project (with `pgvector` enabled and the provided SQL migration executed)
- An API key for [Typhoon API](https://opentyphoon.ai/) (LLM generation)
- An API token for [HuggingFace](https://huggingface.co/) (Embedding generation)

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root of the project (you can copy `.env.example`) and add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Typhoon API Key (for LLM generation)
TYPHOON_API_KEY=your_typhoon_api_key

# HuggingFace API Token (for Vector Embeddings)
HF_API_TOKEN=your_huggingface_api_token
```

### 3. Database Setup

Ensure you have run the provided SQL migration (`supabase-migration-chat-history.sql`) in your Supabase SQL editor to create the necessary tables for chat history and RAG functionality.

### 4. Run the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔄 Architecture & Workflow

BU Dorms uses a Retrieval-Augmented Generation (RAG) pipeline to accurately answer your questions about dorms.

1. **User Query**: The user inputs a question or a search term related to finding a dorm through the chat interface.
2. **Embedding Generation**: The application uses the HuggingFace Inference API to convert the user's query into a vector embedding.
3. **Vector Search (Retrieval)**: The query embedding is used to perform a semantic search within Supabase (`pgvector`). The database retrieves the most relevant dorms based on the query.
4. **Context Assembly**: The retrieved dorm information (names, prices, descriptions, amenities, and images) is formatted and assembled into a structured context.
5. **LLM Generation**: The user's query and the assembled context are sent to the Typhoon LLM. The model generates a conversational, helpful response acting as a friendly assistant.
6. **Response Delivery**: The generated text, along with interactive dorm cards containing images and details, are streamed back to the frontend chat interface.

## 📂 Project Structure

- `app/`: Next.js App Router setup including all pages (login, signup, history, settings, etc.)
- `app/components/`: Reusable React application components (Chat, Sidebar, Settings, etc.)
- `lib/supabase/`: Supabase client and server configuration
- `public/`: Static assets including Rive animations (`login-animation.riv`)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is open-source and available under the MIT License.

### ⚠️ Limitations & Disclaimer

- **Educational Purpose:** This project and its source code are created for educational and demonstration purposes only.
- **Data Ownership:** The dorm data, descriptions, prices, and images used or retrieved by the RAG pipeline are the property of their respective owners. They are used here strictly for demonstration and may be subject to their own copyright or usage terms.
- **Accuracy:** The information provided by the AI chatbot may not always be 100% accurate, complete, or up-to-date. Users should verify any critical information (such as prices and availability) directly with the respective dormitories.
