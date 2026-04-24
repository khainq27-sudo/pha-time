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
  }, []);

  const startYear = new Date(now.getFullYear(), 0, 1, 7);
  const endYear = new Date(now.getFullYear() + 1, 0, 1, 7);

  const isFirstHalf = now.getMonth() < 6;
  const startHalf = isFirstHalf
    ? new Date(now.getFullYear(), 0, 1, 7)
    : new Date(now.getFullYear(), 6, 1, 7);
  const endHalf = isFirstHalf
    ? new Date(now.getFullYear(), 6, 1, 7)
    : new Date(now.getFullYear() + 1, 0, 1, 7);

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

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 7);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 7);

  const startDay = new Date(now);
  startDay.setHours(7, 0, 0, 0);
  if (now < startDay) startDay.setDate(startDay.getDate() - 1);
  const endDay = new Date(startDay.getTime() + 86400000);

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
      <Timeline title="1 Ngày" start={startDay} end={endDay} now={now} />
    </div>
  );
}

function Timeline({ title, start, end, now }: any) {
  const progress =
    ((now.getTime() - start.getTime()) /
      (end.getTime() - start.getTime())) *
    100;

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 600;

  const total = isMobile ? 8 : 16;

  const ticks = [];
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
        {ticks.map((t: any, i: number) => (
          <div key={i} style={{ ...styles.tick, left: `${t.percent}%` }}>
            <div>{t.label}</div>
            {!isMobile && <div>{t.hour}</div>}
            <div style={styles.dot}></div>
          </div>
        ))}

        <div style={styles.bar}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={styles.part} />
          ))}
          <div style={{ ...styles.line, left: `${progress}%` }}></div>
        </div>

        <div style={{ ...styles.now, left: `${progress}%` }}>NOW</div>
      </div>
    </div>
  );
}

const styles: any = {
  container: {
    background: "#fff",
    minHeight: "100vh",
    padding: 10,
  },

  header: { textAlign: "center" },

  title: {
    fontSize: "clamp(18px, 4vw, 34px)",
    fontWeight: "bold",
  },

  qkay: { color: "#2563eb" },

  time: {
    color: "#2563eb",
    fontSize: "clamp(12px, 3vw, 16px)",
  },

  leftSection: {
    paddingLeft: "clamp(10px, 4vw, 40px)",
    marginTop: 20,
  },

  candleBox: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  candleIcon: { position: "relative", width: 12, height: 30 },
  wick: {
    width: 2,
    height: 30,
    background: "#555",
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },
  body: {
    width: 10,
    height: 14,
    background: "#22c55e",
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
  },

  candleTitle: {
    fontSize: "clamp(14px, 3vw, 20px)",
    fontWeight: "bold",
  },

  market: {
    fontSize: "clamp(12px, 2.5vw, 14px)",
  },

  price: {
    fontSize: "clamp(14px, 3vw, 20px)",
    fontWeight: "bold",
  },

  timeFrameBox: {
    display: "flex",
    gap: 10,
    paddingLeft: "clamp(10px, 4vw, 40px)",
    marginTop: 20,
    alignItems: "center",
  },

  clockIcon: { position: "relative", width: 20, height: 20 },
  clockCircle: {
    border: "2px solid #555",
    borderRadius: "50%",
    width: "100%",
    height: "100%",
  },
  hourHand: {
    width: 2,
    height: 6,
    background: "#555",
    position: "absolute",
    top: 5,
    left: "50%",
    transform: "translateX(-50%)",
  },
  minuteHand: {
    width: 2,
    height: 8,
    background: "#555",
    position: "absolute",
    top: 3,
    left: "50%",
    transform: "translateX(-50%) rotate(45deg)",
  },

  timeFrameTitle: {
    fontSize: "clamp(14px, 3vw, 18px)",
    fontWeight: "bold",
  },

  timelineRow: {
    marginTop: 40,
    padding: "0 clamp(10px, 4vw, 40px)",
  },

  label: {
    fontSize: "clamp(12px, 3vw, 16px)",
    fontWeight: "bold",
    color: "red",
    marginBottom: 10,
  },

  timelineContent: {
    position: "relative",
    width: "100%",
  },

  bar: {
    display: "flex",
    height: "clamp(30px, 6vw, 50px)",
    borderRadius: 10,
    overflow: "hidden",
    border: "2px solid #94a3b8",
  },

  part: { flex: 1, background: "#e5e7eb" },

  line: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    background: "red",
  },

  tick: {
    position: "absolute",
    top: -25,
    transform: "translateX(-50%)",
    fontSize: "clamp(8px, 2vw, 10px)",
    textAlign: "center",
    whiteSpace: "nowrap",
  },

  dot: {
    width: 5,
    height: 5,
    background: "#333",
    borderRadius: "50%",
    margin: "2px auto",
  },

  now: {
    position: "absolute",
    bottom: -20,
    transform: "translateX(-50%)",
    background: "red",
    color: "#fff",
    fontSize: "clamp(8px, 2vw, 10px)",
    padding: "2px 4px",
    borderRadius: 4,
  },
};