"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [prevPrice, setPrevPrice] = useState("");
  const [now, setNow] = useState(new Date());

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
      }
    };

    return () => ws.close();
  }, [price]); // Thêm price vào dependency để cập nhật prevPrice chuẩn xác

  const getProgress = (start: Date, end: Date) =>
    ((now.getTime() - start.getTime()) /
      (end.getTime() - start.getTime())) *
    100;

  const createPhaseTicks = (start: Date, end: Date) => {
    const ticks = [];
    const totalParts = 16;
    const step = (end.getTime() - start.getTime()) / totalParts;

    for (let i = 0; i <= totalParts; i++) {
      const t = new Date(start.getTime() + step * i);
      ticks.push({
        label: t.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        hour: t.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        percent: (i / totalParts) * 100,
      });
    }
    return ticks;
  };

  // ===== NĂM =====
  const startYear = new Date(now.getFullYear(), 0, 1, 7);
  const endYear = new Date(now.getFullYear() + 1, 0, 1, 7);

  // ===== 6 THÁNG =====
  const isFirstHalf = now.getMonth() < 6;
  const startHalf = isFirstHalf
    ? new Date(now.getFullYear(), 0, 1, 7)
    : new Date(now.getFullYear(), 6, 1, 7);
  const endHalf = isFirstHalf
    ? new Date(now.getFullYear(), 6, 1, 7)
    : new Date(now.getFullYear() + 1, 0, 1, 7);

  // ===== 3 THÁNG =====
  const quarterStart = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1,
    7
  );
  const quarterEnd = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3 + 3,
    1,
    7
  );
  // ===== 1 THÁNG =====
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 7);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 7);
  
  // ===== OKX DAY (7h) =====
  const startDay = new Date(now);
  startDay.setHours(7, 0, 0, 0);
  if (now < startDay) startDay.setDate(startDay.getDate() - 1);
  const endDay = new Date(startDay.getTime() + 86400000);

  const makeRange = (days: number) => ({
    start: new Date(startDay.getTime() - (days - 1) * 86400000),
    end: endDay,
  });

  // ===== CUSTOM TIME =====

  // Tuần: 7:00 20/4
  const d7 = {
    start: new Date(now.getFullYear(), 3, 20, 7),
    end: new Date(now.getFullYear(), 3, 20, 7 + 24 * 7),
  };

  // 5 ngày: 7:00 22/4
  const d5 = {
    start: new Date(now.getFullYear(), 3, 22, 7),
    end: new Date(now.getFullYear(), 3, 22, 7 + 24 * 5),
  };

  // 3 ngày: 7:00 22/4
  const d3 = {
    start: new Date(now.getFullYear(), 3, 22, 7),
    end: new Date(now.getFullYear(), 3, 22, 7 + 24 * 3),
  };

  // 2 ngày: 7:00 23/4
  const d2 = {
    start: new Date(now.getFullYear(), 3, 23, 7),
    end: new Date(now.getFullYear(), 3, 23, 7 + 24 * 2),
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.qkay}>QKAY</span> - BMAGVN - PHA THỜI GIAN
        </h1>
        <p style={styles.time}>Thời gian hiện tại: {time}</p>
      </div>

      <div style={styles.leftSection}>
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
                color:
                  price > prevPrice
                    ? "#22c55e"
                    : price < prevPrice
                    ? "#ef4444"
                    : "#111",
              }}
            >
              {price} USDT
            </div>
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

// ===== COMPONENT =====
function Timeline({
  title,
  start,
  end,
  now,
}: {
  title: string;
  start: Date;
  end: Date;
  now: Date;
}) {
  const progress =
    ((now.getTime() - start.getTime()) /
      (end.getTime() - start.getTime())) *
    100;
  const ticks = [];

  const total = 16;
  const currentPart = Math.floor(progress / (100 / total));
  const step = (end.getTime() - start.getTime()) / total;

  for (let i = 0; i <= total; i++) {
    const t = new Date(start.getTime() + step * i);
    ticks.push({
      percent: (i / total) * 100,
      label: t.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      hour: t.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  return (
    <div style={styles.timelineRow}>
      <div style={styles.label}>{title}</div>

      <div style={styles.timelineContent}>
        {ticks.map((t, i) => (
          <div key={i} style={{ ...styles.tick, left: `${t.percent}%` }}>
            <div>{t.label}</div>
            <div>{t.hour}</div>
            <div style={styles.dot}></div>
          </div>
        ))}

        <div style={styles.bar}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.part,
                background: ["#93c5fd", "#86efac", "#fef08a", "#f9a8d4"][i],
                opacity: Math.floor(currentPart / 4) === i ? 1 : 0.4,
                transform:
                  Math.floor(currentPart / 4) === i ? "scaleY(1.1)" : "scaleY(1)",
              }}
            />
          ))}

          <div style={{ ...styles.line, left: `${progress}%` }}></div>
        </div>

        <div style={{ ...styles.now, left: `${progress}%` }}>NOW</div>
      </div>
    </div>
  );
}

// ===== ĐÂY LÀ PHẦN STYLE MỚI - BẠN DÁN ĐÈ VÀO CUỐI FILE =====
const styles: any = {
  container: { background: "#fff", minHeight: "100vh", overflowX: "hidden", paddingBottom: "40px" },
  header: { textAlign: "center", paddingTop: 20, paddingInline: "10px" },
  title: { fontSize: "clamp(20px, 5vw, 34px)", fontWeight: "bold" },
  qkay: { color: "#2563eb" },
  time: { color: "#2563eb", fontSize: "clamp(12px, 3vw, 16px)" },

  leftSection: { paddingLeft: "clamp(15px, 5vw, 40px)", marginTop: "clamp(15px, 4vw, 30px)" },
  candleBox: { display: "flex", gap: "clamp(8px, 2vw, 12px)", alignItems: "center" },
  candleIcon: { position: "relative", width: 12, height: 30 },
  wick: { width: 2, height: 30, background: "#555", position: "absolute", left: "50%", transform: "translateX(-50%)" },
  body: { width: 10, height: 14, background: "#22c55e", position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)" },

  candleTitle: { color: "#a855f7", fontWeight: "bold", fontSize: "clamp(18px, 4vw, 30px)" },
  market: { color: "#6b7280", fontSize: "clamp(12px, 3vw, 16px)" },
  price: { fontSize: "clamp(16px, 4vw, 20px)", fontWeight: "bold" },

  timeFrameBox: { display: "flex", gap: 10, paddingLeft: "clamp(15px, 5vw, 40px)", marginTop: "clamp(15px, 4vw, 30px)", alignItems: "center" },
  clockIcon: { position: "relative", width: 24, height: 24 },
  clockCircle: { border: "2px solid #555", borderRadius: "50%", width: "100%", height: "100%" },
  hourHand: { width: 2, height: 7, background: "#555", position: "absolute", top: 5, left: "50%", transform: "translateX(-50%)" },
  minuteHand: { width: 2, height: 10, background: "#555", position: "absolute", top: 2, left: "50%", transform: "translateX(-50%) rotate(45deg)" },

  timeFrameTitle: { color: "#a855f7", fontWeight: "bold", fontSize: "clamp(18px, 4vw, 24px)" },

  timelineRow: { display: "flex", alignItems: "center", flexDirection: "column", marginTop: "clamp(20px, 4vw, 30px)", padding: "0 clamp(10px, 3vw, 40px)", gap: 0 },
  label: { width: "clamp(80px, 20vw, 120px)", color: "red", fontWeight: "bold", textAlign: "center", marginBottom: "clamp(35px, 8vw, 45px)", fontSize: "clamp(14px, 3vw, 18px)" },
  
  timelineContent: { position: "relative", width: "100%" },

  bar: { display: "flex", width: "100%", height: "clamp(30px, 6vw, 50px)", borderRadius: 10, overflow: "hidden", border: "2px solid #94a3b8" },
  part: { flex: 1 },
  line: { position: "absolute", top: 0, bottom: 0, width: 2, background: "red", zIndex: 2 },

  tick: { 
    position: "absolute", 
    bottom: "100%", 
    transform: "translate(-50%, 4px)", 
    fontSize: "clamp(8.5px, 2vw, 13px)", 
    color: "#000", 
    fontWeight: "700", 
    textAlign: "center", 
    whiteSpace: "nowrap",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  dot: { 
    width: "clamp(4px, 1.2vw, 6px)", 
    height: "clamp(4px, 1.2vw, 6px)", 
    background: "#000", 
    borderRadius: "50%", 
    marginTop: "3px" 
  },

  now: {
    position: "absolute",
    top: "100%", 
    transform: "translate(-50%, 4px)", 
    background: "red",
    color: "#fff",
    fontSize: "clamp(8px, 1.8vw, 10px)",
    padding: "2px 6px",
    borderRadius: 4,
    zIndex: 2,
  },
};