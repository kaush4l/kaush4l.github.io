import "./globals.css";
import Files from "./util";
import MarkdownContent from "./markdownRender";

export const metadata = {
  title: "Dynamic Resume",
  description: "Resume website to learn Next.js",
};

export default function RootLayout({ children }) {
  const filesMap = Files({});
  console.log(filesMap);

  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <nav className="w-1/4 bg-gray-200 p-4 text-black">
            <ul>
              {Object.keys(filesMap).map((directory) => (
                <li key={directory} className="mb-2">
                  <a href={`#${directory}`}>{directory}</a>
                </li>
              ))}
            </ul>
          </nav>
          <main className="w-3/4 p-4">
            {children}
          </main>
        </div>
        <footer className="mt-auto bg-gray-800 text-white text-center py-4">
          Made with AI
        </footer>
      </body>
    </html>
  );
}
