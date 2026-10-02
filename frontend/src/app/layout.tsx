import TopBar from "@/components/TopBar";
import { MyGroupProvider } from "@/context/MyGroup";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          minWidth: 0,
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
          background: "#fff",
          color: "#111",
          fontFamily:
            'Arial, "Helvetica Neue", Helvetica, system-ui, -apple-system, sans-serif',
        }}
      >
        <MyGroupProvider>
          <TopBar title="SamDang" />
          <div
            style={{
              width: "100%",
              maxWidth: 1180,
              margin: "0 auto",
              padding: "clamp(12px, 3vw, 20px)",
              boxSizing: "border-box",
            }}
          >
            {children}
          </div>
        </MyGroupProvider>
      </body>
    </html>
  );
}
