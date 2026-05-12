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

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Make sure you have Node.js installed on your machine.

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root of the project and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

- `app/`: Next.js App Router setup including all pages (login, signup, history, settings, etc.)
- `app/components/`: Reusable React application components (Chat, Sidebar, Settings, etc.)
- `lib/supabase/`: Supabase client and server configuration
- `public/`: Static assets including Rive animations (`login-animation.riv`)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the MIT License.
