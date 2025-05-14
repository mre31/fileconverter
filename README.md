# File Converter

A versatile web-based tool for converting image files between various formats, with options for quality adjustment and specialized ICO file generation. Built with Next.js.

## Features

*   **Multiple Format Support:** Convert images to and from popular formats like PNG, JPEG, WebP, AVIF, SVG, and ICO.
*   **Quality Control:** Adjust the quality for lossy formats (JPEG, WebP, AVIF) to balance file size and visual fidelity.
*   **ICO Generation:**
    *   Create a ZIP archive containing multiple `.ico` files, each generated from a different resolution of the source image.

## Technologies Used

*   **Frontend:**
    *   [Next.js](https://nextjs.org/) (React Framework)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   TypeScript
*   **Backend:**
    *   Next.js API Routes
    *   [Sharp](https://sharp.pixelplumbing.com/) (for image processing)
    *   [JSZip](https://stuk.github.io/jszip/) (for creating ZIP archives for ICOs)
    *   [png-to-ico](https://github.com/steambap/png-to-ico) (for generating individual .ico files)
*   **Deployment:** (Assumed, can be Vercel or any Node.js hosting)

## Getting Started

First, ensure you have Node.js and npm (or yarn/pnpm) installed.

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd fileconverter
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    # or
    # pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the main page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## License

This project is licensed under the BSD 3-Clause License.
