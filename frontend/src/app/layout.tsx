import TopBar from "@/components/TopBar";
import { LiffProfProvider } from "@/context/LiffProf";
import { MyGroupProvider } from "@/context/MyGroup";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          minWidth: 0,
          background: "#fff",
          color: "#111",
          fontFamily:
            'Arial, "Helvetica Neue", Helvetica, system-ui, -apple-system, sans-serif',
        }}
      >
        <LiffProfProvider>
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
        </LiffProfProvider>
      </body>
    </html>
  );
}
