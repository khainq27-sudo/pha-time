"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [prevPrice, setPrevPrice] = useState("");
  const [openPrice, setOpenPrice] = useState(""); // Giá mở cửa 7h sáng
  const [now, setNow] = useState(new Date());
  const [chartData, setChartData] = useState<number[]>([]); // Dữ liệu sóng

  // Cập nhật đồng hồ
  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date();
      const formatted = current.toLocaleString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(formatted);
      setNow(current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dữ liệu nến cho biểu đồ sóng (Candles 5m)
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch(
          "https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=5m&limit=300"
        );
        const json = await res.json();
        if (json.data) {
          const currentTime = new Date();
          const startDay = new Date(currentTime);
          startDay.setHours(7, 0, 0, 0);
          if (currentTime < startDay) startDay.setDate(startDay.getDate() - 1);
          const targetTs = startDay.getTime();

          // Lọc nến từ 7h sáng đến hiện tại
          const validData = json.data
            .filter((candle: any[]) => parseInt(candle[0]) >= targetTs)
            .map((candle: any[]) => parseFloat(candle[4])) // Lấy giá close
            .reverse(); // OKX trả về mới nhất trước, cần đảo ngược lại

          setChartData(validData);
        }
      } catch (error) {
        console.error("Lỗi fetch dữ liệu sóng:", error);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 60000); // Cập nhật sóng mỗi 1 phút
    return () => clearInterval(interval);
  }, []);

  // WebSocket lấy giá realtime và giá mở cửa
  useEffect(() => {
    const ws = new WebSocket("wss://ws.okx.com:8443/ws/v5/public");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          op: "subscribe",
          args: [{ channel: "tickers", instId: "BTC-USDT" }],
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.data) {
        setPrevPrice(price);
        setPrice(data.data[0].last);
        // sodUtc0 là giá mở cửa lúc 00:00 UTC (Đúng 7h00 sáng VN)
        if (data.data[0].sodUtc0) {
          setOpenPrice(data.data[0].sodUtc0);
        }
      }
    };

    return () => ws.close();
  }, [price]);

  // ===== TÍNH TOÁN % TĂNG GIẢM =====
  const p = parseFloat(price);
  const op = parseFloat(openPrice);
  let diffStr = "";
  let isUp = true;

  if (!isNaN(p) && !isNaN(op) && op !== 0) {
    const diff = p - op;
    isUp = diff >= 0;
    const pct = ((diff / op) * 100).toFixed(2);
    const sign = isUp ? "+" : "";
    diffStr = `${sign}${pct}% (${sign}${diff.toFixed(1)} USDT)`;
  }

  // ===== CÁC BIẾN THỜI GIAN CŨ =====
  const startYear = new Date(now.getFullYear(), 0, 1, 7);
  const endYear = new Date(now.getFullYear() + 1, 0, 1, 7);

  const isFirstHalf = now.getMonth() < 6;
  const startHalf = isFirstHalf
    ? new Date(now.getFullYear(), 0, 1, 7)
    : new Date(now.getFullYear(), 6, 1, 7);
  const endHalf = isFirstHalf
    ? new Date(now.getFullYear(), 6, 1, 7)
    : new Date(now.getFullYear() + 1, 0, 1, 7);

  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1, 7);
  const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1, 7);

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 7);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 7);
  
  const startDay = new Date(now);
  startDay.setHours(7, 0, 0, 0);
  if (now < startDay) startDay.setDate(startDay.getDate() - 1);
  const endDay = new Date(startDay.getTime() + 86400000);

  const d7 = { start: new Date(now.getFullYear(), 3, 20, 7), end: new Date(now.getFullYear(), 3, 20, 7 + 24 * 7) };
  const d5 = { start: new Date(now.getFullYear(), 3, 22, 7), end: new Date(now.getFullYear(), 3, 22, 7 + 24 * 5) };
  const d3 = { start: new Date(now.getFullYear(), 3, 22, 7), end: new Date(now.getFullYear(), 3, 22, 7 + 24 * 3) };
  const d2 = { start: new Date(now.getFullYear(), 3, 23, 7), end: new Date(now.getFullYear(), 3, 23, 7 + 24 * 2) };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {/* PHẦN TITLE KÈM AVATAR */}
        <div style={styles.titleWrapper}>
          <img src="/11.jpg" alt="QKAY Avatar" style={styles.avatar} />
          <h1 style={styles.title}>
            <span style={styles.qkay}>QKAY</span> - BMAGVN - PHA THỜI GIAN
          </h1>
        </div>
        <p style={styles.time}>Thời gian hiện tại: {time}</p>
      </div>

      {/* BỌC PHẦN THÔNG TIN NẾN VÀ SÓNG VÀO MỘT CARD GIỐNG HÌNH */}
      <div style={styles.topCardWrapper}>
        <div style={styles.introBox}>
        <div style={styles.gradientText}>Telegram: @tonnykay</div>
        <div style={styles.gradientText}>Copy sàn Binance: QKay89 BMAGVN</div>
        <a 
            href="https://www.binance.com/referral/earn-together/refer2earn-usdc/claim?hl=vi&ref=GRO_28502_A4JQ8&utm_source=referral_entrance" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={styles.gradientLink}
  >
            Link đăng ký Binance: Nhấp tại đây
        </a>
      </div>
        <div style={styles.topCard}>
          {/* CỘT TRÁI: THÔNG TIN NẾN */}
          <div style={styles.candleInfoSide}>
            <div style={styles.candleBox}>
              <div style={styles.candleIcon}>
                <div style={styles.wick}></div>
                <div style={styles.body}></div>
              </div>
              <div>
                <div style={styles.candleTitle}>THÔNG TIN NẾN</div>
                <div style={styles.market}>Bitcoin / USDT</div>
                <div
                  style={{
                    ...styles.price,
                    color: price > prevPrice ? "#22c55e" : price < prevPrice ? "#ef4444" : "#111",
                  }}
                >
                  {price ? parseFloat(price).toLocaleString() : "..."} USDT
                </div>
                {diffStr && (
                  <div style={styles.changePercentBox}>
                    <span style={{ color: isUp ? "#22c55e" : "#ef4444", fontWeight: "bold", fontSize: "14px" }}>
                      {diffStr}
                    </span>
                    <span style={{ ...styles.badge, background: isUp ? "#dcfce7" : "#fee2e2", color: isUp ? "#16a34a" : "#ef4444" }}>
                      {isUp ? "Tăng" : "Giảm"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BIỂU ĐỒ SÓNG */}
          <div style={styles.chartSide}>
            <WaveChart data={chartData} openPrice={parseFloat(openPrice)} currentPrice={parseFloat(price)} />
          </div>
        </div>
      </div>

      <div style={styles.timeFrameBox}>
        <div style={styles.clockIcon}>
          <div style={styles.clockCircle}></div>
          <div style={styles.hourHand}></div>
          <div style={styles.minuteHand}></div>
        </div>
        <div style={styles.timeFrameTitle}>KHUNG THỜI GIAN</div>
      </div>

      <Timeline title="Năm" start={startYear} end={endYear} now={now} />
      <Timeline title="6 Tháng" start={startHalf} end={endHalf} now={now} />
      <Timeline title="3 Tháng" start={quarterStart} end={quarterEnd} now={now} />
      <Timeline title="1 Tháng" start={startMonth} end={endMonth} now={now} />
      <Timeline title="Tuần" start={d7.start} end={d7.end} now={now} />
      <Timeline title="5 Ngày" start={d5.start} end={d5.end} now={now} />
      <Timeline title="3 Ngày" start={d3.start} end={d3.end} now={now} />
      <Timeline title="2 Ngày" start={d2.start} end={d2.end} now={now} />
      <Timeline title="1 Ngày" start={startDay} end={endDay} now={now} />
    </div>
  );
}

// ===== COMPONENT VẼ SÓNG (SPARKLINE) =====
function WaveChart({ data, openPrice, currentPrice }: { data: number[]; openPrice: number; currentPrice: number }) {
  if (!data || data.length === 0 || isNaN(openPrice)) return null;

  // Lấy data point mới nhất để cập nhật live từ WebSocket nếu có
  const chartData = [...data];
  if (!isNaN(currentPrice)) chartData[chartData.length - 1] = currentPrice;

  const minData = Math.min(...chartData, openPrice);
  const maxData = Math.max(...chartData, openPrice);
  
  // Tạo biên độ padding cho y để sóng không chạm viền
  const range = maxData - minData || 1;
  const padding = range * 0.2; 
  const min = minData - padding;
  const max = maxData + padding;

  const isGreen = currentPrice >= openPrice;
  const color = isGreen ? "#22c55e" : "#ef4444"; // Xanh lá nếu >= mở cửa, ngược lại đỏ

  // Dựng hàm map điểm data thành tọa độ SVG
  const width = 800; 
  const height = 150;
  
  const getX = (index: number) => (index / (chartData.length - 1)) * width;
  const getY = (val: number) => height - ((val - min) / (max - min)) * height;

  const pathD = `M ${chartData.map((d, i) => `${getX(i)},${getY(d)}`).join(" L ")}`;
  const openY = getY(openPrice);

  return (
    <div style={{ width: "100%", height: "100px", position: "relative" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Đường đứt nét giá mở cửa */}
        <line x1={0} y1={openY} x2={width} y2={openY} stroke="#9ca3af" strokeDasharray="5,5" strokeWidth="2" />
        
        {/* Đường sóng */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      
      {/* Label Giá mở cửa */}
      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "5px", fontSize: "13px", color: "#6b7280" }}>
        Giá mở cửa: {openPrice.toLocaleString()}
      </div>
    </div>
  );
}

// ===== COMPONENT TIMELINE GỐC =====
function Timeline({ title, start, end, now }: { title: string; start: Date; end: Date; now: Date; }) {
  const progress =
    ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
  
  const totalTicks = 16;
  const step = (end.getTime() - start.getTime()) / totalTicks;

  const phases = [
    { label: "1/4 đầu", color: "#93c5fd", range: [0, 4] },
    { label: "1/4 thứ 2", color: "#86efac", range: [4, 8] },
    { label: "1/4 thứ 3", color: "#fef08a", range: [8, 12] },
    { label: "1/4 cuối cùng", color: "#f9a8d4", range: [12, 16] },
  ];

  return (
    <div style={styles.timelineRow}>
      <div style={styles.label}>{title}</div>
      <div style={styles.responsiveGrid}>
        {phases.map((phase, phaseIdx) => {
          const [startIdx, endIdx] = phase.range;
          const phaseStartPercent = (startIdx / totalTicks) * 100;
          const phaseEndPercent = (endIdx / totalTicks) * 100;
          
          const isNowInPhase = progress >= phaseStartPercent && progress < phaseEndPercent;
          const relativeProgress = ((progress - phaseStartPercent) / (phaseEndPercent - phaseStartPercent)) * 100;

          const ticks = [];
          for (let i = startIdx; i <= endIdx; i++) {
            const t = new Date(start.getTime() + step * i);
            ticks.push({
              percent: ((i - startIdx) / (endIdx - startIdx)) * 100,
              label: t.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
              hour: t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            });
          }

          return (
            <div key={phaseIdx} style={styles.phaseContainer}>
              <div style={styles.timelineContent}>
                {ticks.map((t, i) => (
                  <div key={i} style={{ ...styles.tick, left: `${t.percent}%` }}>
                    {i !== 0 && i !== ticks.length - 1 && (
                      <>
                        <div>{t.label}</div>
                        <div>{t.hour}</div>
                      </>
                    )}
                    <div style={styles.dot}></div>
                  </div>
                ))}
                <div style={{ ...styles.bar, background: phase.color, opacity: isNowInPhase ? 1 : 0.6 }}>
                  <div style={styles.phaseText}>{phase.label}</div>
                  {isNowInPhase && (
                    <>
                      <div style={{ ...styles.line, left: `${relativeProgress}%` }}></div>
                      <div style={{ ...styles.now, left: `${relativeProgress}%` }}>NOW</div>
                    </>
                  )}
                </div>
                <div style={styles.rangeTextContainer}>
                  <span>{ticks[0].label} {ticks[0].hour}</span>
                  <span>{ticks[ticks.length-1].label} {ticks[ticks.length-1].hour}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== PHẦN STYLE ĐÃ CẬP NHẬT =====
const styles: any = {
  introBox: {
    marginBottom: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "0 5px"
  },
  gradientLink: {
    fontSize: "18px",
    fontWeight: "bold",
    background: "linear-gradient(90deg, #2563eb, #a855f7, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    display: "inline-block",
    textDecoration: "none", // Để không bị gạch chân màu xanh mặc định của link
    letterSpacing: "0.5px",
    cursor: "pointer"
  },
  gradientText: {
    fontSize: "18px",
    fontWeight: "bold",
    background: "linear-gradient(90deg, #2563eb, #a855f7, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    display: "inline-block",
    textTransform: "none",
    letterSpacing: "0.5px"
  },
  container: { 
    background: "#fafafa", 
    minHeight: "100vh", 
    paddingBottom: "50px", 
    fontFamily: "Arial, sans-serif",
    WebkitFontSmoothing: "antialiased" // Khử răng cưa giúp chữ sắc nét hơn trên mobile
  },
  header: { 
    textAlign: "center", 
    paddingTop: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  titleWrapper: { 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: "15px", 
    flexWrap: "wrap",
    marginBottom: "8px"
  },
  avatar: { 
    width: "65px", 
    height: "65px", 
    borderRadius: "50%", 
    objectFit: "cover", 
    border: "3px solid #cbd5e1" // Viền giống với ảnh mẫu
  },
  title: { 
    fontSize: "clamp(22px, 5vw, 36px)", 
    fontWeight: "900", // Tăng độ đậm để tránh bị mờ
    margin: 0,
    color: "#111"
  },
  qkay: { color: "#2563eb" },
  time: { color: "#2563eb", fontSize: "14px", marginTop: "5px" },

  // Bố cục khung thông tin nến và sóng mới
  topCardWrapper: { padding: "0 10%", marginTop: "20px" },
  topCard: { 
    display: "flex", 
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", 
    alignItems: "center",
    background: "#fff", 
    padding: "20px 30px", 
    borderRadius: "12px", 
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
    gap: "30px"
  },
  candleInfoSide: { minWidth: "250px", flexShrink: 0 },
  chartSide: { flexGrow: 1, minWidth: "300px" },
  
  candleBox: { display: "flex", gap: 15, alignItems: "flex-start" },
  candleIcon: { position: "relative", width: 12, height: 30, marginTop: 5 },
  wick: { width: 2, height: 30, background: "#22c55e", position: "absolute", left: "50%", transform: "translateX(-50%)" },
  body: { width: 10, height: 18, background: "#22c55e", position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)" },
  candleTitle: { color: "#a855f7", fontWeight: "bold", fontSize: "20px", textTransform: "uppercase" },
  market: { color: "#6b7280", fontSize: "14px", marginTop: "4px" },
  price: { fontSize: "28px", fontWeight: "bold", marginTop: "4px" },
  
  changePercentBox: { display: "flex", gap: "10px", alignItems: "center", marginTop: "6px" },
  badge: { padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" },

  timeFrameBox: { display: "flex", gap: 10, paddingLeft: "10%", marginTop: "40px", alignItems: "center" },
  clockIcon: { position: "relative", width: 24, height: 24 },
  clockCircle: { border: "2px solid #555", borderRadius: "50%", width: "100%", height: "100%" },
  hourHand: { width: 2, height: 7, background: "#555", position: "absolute", top: 5, left: "50%", transform: "translateX(-50%)" },
  minuteHand: { width: 2, height: 10, background: "#555", position: "absolute", top: 2, left: "50%", transform: "translateX(-50%) rotate(45deg)" },
  timeFrameTitle: { color: "#a855f7", fontWeight: "bold", fontSize: "22px" },

  timelineRow: { marginTop: 30, padding: "0 10%" },
  label: { color: "red", fontWeight: "bold",  textAlign: "center", fontSize: "20px", marginBottom: "50px" },
  
  responsiveGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "30px 10px" },
  phaseContainer: { marginBottom: "20px" },
  timelineContent: { position: "relative", width: "100%" },

  bar: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "35px", borderRadius: "8px", border: "1px solid #94a3b8", position: "relative" },
  phaseText: { color: "#2563eb", fontWeight: "bold", fontSize: "14px", zIndex: 1 },
  line: { position: "absolute", top: 0, bottom: 0, width: 2, background: "red", zIndex: 2 },

  // Chỉnh sửa lại phần này để chống mờ trên điện thoại
  tick: { 
    position: "absolute", 
    bottom: "100%", 
    transform: "translate(-50%, -2px)", 
    fontSize: "11.5px", // Đã tăng từ 10px lên
    fontWeight: "600",  // Làm đậm thêm một chút
    color: "#444",      // Đổi sang xám đậm hơn thay vì #666
    textAlign: "center", 
    whiteSpace: "nowrap", 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    zIndex: 3 
  },
  dot: { width: "4px", height: "4px", background: "#777", borderRadius: "50%", marginTop: "4px" },

  // Cập nhật text thời gian start/end mốc dưới
  rangeTextContainer: { 
    display: "flex", 
    justifyContent: "space-between", 
    fontSize: "11.5px", // Tăng từ 10px
    color: "#444", 
    marginTop: "6px", 
    fontWeight: "600" 
  },
  now: { position: "absolute", top: "110%", transform: "translateX(-50%)", background: "red", color: "#fff", fontSize: "9px", padding: "2px 5px", borderRadius: "4px", zIndex: 4 },
};