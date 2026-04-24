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

  // ===== TIME =====
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

  const d7 = {
    start: new Date(now.getFullYear(), 3, 20, 7),
    end: new Date(now.getFullYear(), 3, 20, 7 + 24 * 7),
  };

  const d5 = {
    start: new Date(now.getFullYear(), 3, 22, 7),
    end: new Date(now.getFullYear(), 3, 22, 7 + 24 * 5),
  };

  const d3 = {
    start: new Date(now.getFullYear(), 3, 22, 7),
    end: new Date(now.getFullYear(), 3, 22, 7 + 24 * 3),
  };

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

// ===== TIMELINE =====
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

  const currentPart = Math.floor(progress / (100 / 16));

  return (
    <div style={styles.timelineRow}>
      {/* LABEL TRÊN GIỮA */}
      <div style={styles.centerLabel}>{title}</div>

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
            <div
              key={i}
              style={{
                ...styles.part,
                background: ["#93c5fd", "#86efac", "#fef08a", "#f9a8d4"][i],
                opacity: Math.floor(currentPart / 4) === i ? 1 : 0.4,
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

// ===== STYLE =====
const styles: any = {
  container: { padding: 10 },

  header: { textAlign: "center" },

  title: { fontSize: "clamp(18px,4vw,34px)", fontWeight: "bold" },

  qkay: { color: "#2563eb" },

  time: { fontSize: "clamp(12px,3vw,16px)" },

  timelineRow: {
    marginTop: 50,
    padding: "0 clamp(10px,4vw,40px)",
    position: "relative",
  },

  centerLabel: {
    textAlign: "center",
    fontWeight: "bold",
    color: "red",
    marginBottom: 25,
    fontSize: "clamp(14px,3vw,18px)",
  },

  timelineContent: {
    position: "relative",
  },

  bar: {
    display: "flex",
    height: "clamp(30px,6vw,50px)",
    borderRadius: 10,
    overflow: "hidden",
    border: "2px solid #94a3b8",
  },

  part: { flex: 1 },

  line: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    background: "red",
  },

  tick: {
    position: "absolute",
    top: -30,
    transform: "translateX(-50%)",
    fontSize: "clamp(8px,2vw,10px)",
    textAlign: "center",
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
    fontSize: 10,
    padding: "2px 4px",
    borderRadius: 4,
  },
};