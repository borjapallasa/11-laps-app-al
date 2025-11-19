import "@/styles/globals.css";
import { Providers } from "@/src/components/Providers";

export const metadata = {
  title: "ElevenLabs TTS App",
  description: "Text-to-Speech generation with ElevenLabs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

