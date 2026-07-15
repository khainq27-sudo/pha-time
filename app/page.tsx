"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [prevPrice, setPrevPrice] = useState("");
  const [openPrice, setOpenPrice] = useState(""); 
  const [now, setNow] = useState<Date | null>(null); 
  const [chartData, setChartData] = useState<number[]>([]); 
  const [coin, setCoin] = useState("BTC");

  // 1. Cập nhật đồng hồ (Ép cứng hiển thị theo múi giờ Việt Nam UTC+7)
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      const current = new Date();
      const formatted = current.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
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

  // 2. Fetch dữ liệu nến cho biểu đồ sóng (Candles 5m trong ngày hiện tại - Chuyển sang Binance để chính xác)
  useEffect(() => {
    let ignore = false; 
    
    const fetchChartData = async () => {
      try {
        const currentTime = new Date();
        // Tính mốc 7h sáng VN (00:00 UTC) của ngày hiện tại
        const uY = currentTime.getUTCFullYear();
        const uM = currentTime.getUTCMonth();
        const uD = currentTime.getUTCDate();
        const startDayTs = Date.UTC(uY, uM, uD);

        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${coin}USDT&interval=5m&startTime=${startDayTs}&limit=500`,
          { cache: "no-store" }
        );
        const json = await res.json();
        
        if (ignore) return; 
        if (Array.isArray(json) && json.length > 0) {
          // Binance format: [time, open, high, low, close, volume, ...]
          const validData = json.map((candle: any[]) => parseFloat(candle[4]));
          setChartData(validData);
        }
      } catch (error) {
        console.error("Lỗi fetch dữ liệu sóng:", error);
      }
    };
    
    fetchChartData();
    const interval = setInterval(fetchChartData, 60000);
    
    return () => {
      ignore = true; 
      clearInterval(interval);
    };
  }, [coin]);

  // 3. WebSocket lấy giá realtime và giá mở cửa ngày (Giữ nguyên OKX cho realtime)
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    let ignore = false; 
    const connectWebSocket = () => {
      ws = new WebSocket("wss://ws.okx.com:8443/ws/v5/public");
      ws.onopen = () => {
        if (ignore) return;
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [{ channel: "tickers", instId: `${coin}-USDT` }],
          })
        );
      };
      
      ws.onmessage = (event) => {
        if (ignore) return; 
        
        const data = JSON.parse(event.data);
        
        if (data.arg && data.arg.instId !== `${coin}-USDT`) return;
        if (data.data && data.data.length > 0) {
          const ticker = data.data[0];
          
          setPrice((currentPrice) => {
            if (currentPrice && currentPrice !== ticker.last) {
              setPrevPrice(currentPrice);
            }
            return ticker.last;
          });
          if (ticker.sodUtc0) {
            setOpenPrice(ticker.sodUtc0);
          }
        }
      };
      
      ws.onclose = () => {
        if (!ignore) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      };
    };
    
    connectWebSocket();
    
    return () => {
      ignore = true;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [coin]); 

  const handleCoinChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCoin = e.target.value;
    setCoin(newCoin);
    setPrice("");
    setOpenPrice("");
    setPrevPrice("");
    setChartData([]);
  };

  if (!now) return null;

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

  // ===== HÀM HỖ TRỢ LẤY MỐC THỜI GIAN (Dùng UTC để chuẩn xác 7h sáng VN = 00:00 UTC) =====
  // Tránh hoàn toàn lỗi lệch múi giờ trên trình duyệt của người dùng
  const uY = now.getUTCFullYear();
  const uM = now.getUTCMonth();
  const uD = now.getUTCDate();
  
  const getAnchorUTC = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 0, 0, 0));

  let startYear = getAnchorUTC(uY, 0, 1);
  const endYear = getAnchorUTC(uY + 1, 0, 1);

  let hMonth = uM >= 6 ? 6 : 0;
  let startHalf = getAnchorUTC(uY, hMonth, 1);
  const endHalf = getAnchorUTC(uY, hMonth + 6, 1);

  let qMonth = Math.floor(uM / 3) * 3;
  let quarterStart = getAnchorUTC(uY, qMonth, 1);
  const quarterEnd = getAnchorUTC(uY, qMonth + 3, 1);

  let startMonth = getAnchorUTC(uY, uM, 1);
  const endMonth = getAnchorUTC(uY, uM + 1, 1);

  let startDay = getAnchorUTC(uY, uM, uD);
  const endDay = new Date(startDay.getTime() + 86400000);
  
  const getRollingPeriodUTC = (anchorY: number, anchorM: number, anchorD: number, days: number) => {
    const anchor = Date.UTC(anchorY, anchorM, anchorD, 0, 0, 0);
    const periodMs = days * 86400000;
    const cycles = Math.floor((now.getTime() - anchor) / periodMs);
    const start = new Date(anchor + cycles * periodMs);
    const end = new Date(start.getTime() + periodMs);
    return { start, end };
  };

  const d2 = getRollingPeriodUTC(2026, 3, 25, 2);
  const d3 = getRollingPeriodUTC(2026, 3, 25, 3);
  const d5 = getRollingPeriodUTC(2026, 3, 22, 5);
  const d7 = getRollingPeriodUTC(2026, 3, 20, 7); 

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleWrapper}>
          <img src="/11.jpg" alt="QKAY Avatar" style={styles.avatar} />
          <h1 style={styles.title}>
            <span style={styles.qkay}>QKAY</span> - BMAGVN - PHA THỜI GIAN
          </h1>
        </div>
        <p style={styles.time}>Thời gian hiện tại: {time}</p>
      </div>
      
      <div style={styles.topCardWrapper}>
        <div style={styles.introBox}>
          <div style={styles.simpleText}>Telegram: @snakekay</div>
          <div style={styles.simpleText}>Copy sàn Binance: SnakeKay</div>
          <a 
            href="https://www.binance.com/referral/earn-together/refer2earn-usdc/claim?hl=vi&ref=GRO_28502_A4JQ8&utm_source=referral_entrance" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={styles.simpleLink}
          >
            Link đăng ký Binance: Nhấp tại đây
          </a>
        </div>
        <div style={styles.topCard}>
          <div style={styles.candleInfoSide}>
            <div style={styles.candleBox}>
              <div style={styles.candleIcon}>
                <div style={styles.wick}></div>
                <div style={styles.body}></div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={styles.candleTitle}>THÔNG TIN NẾN</div>
                  <select 
                    value={coin} 
                    onChange={handleCoinChange}
                    style={styles.coinSelect}
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                
                <div style={styles.market}>{coin === "BTC" ? "Bitcoin" : "Ethereum"} / USDT</div>
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
          <div style={styles.chartSide}>
            <WaveChart key={`wave-${coin}`} data={chartData} openPrice={parseFloat(openPrice)} currentPrice={parseFloat(price)} />
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

      <Timeline key={`${coin}-year`} title="Năm" start={startYear} end={endYear} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-6m`} title="6 Tháng" start={startHalf} end={endHalf} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-3m`} title="3 Tháng" start={quarterStart} end={quarterEnd} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-1m`} title="1 Tháng" start={startMonth} end={endMonth} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-7d`} title="Tuần" start={d7.start} end={d7.end} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-5d`} title="5 Ngày" start={d5.start} end={d5.end} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-3d`} title="3 Ngày" start={d3.start} end={d3.end} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-2d`} title="2 Ngày" start={d2.start} end={d2.end} now={now} currentPrice={parseFloat(price)} coin={coin} />
      <Timeline key={`${coin}-1d`} title="1 Ngày" start={startDay} end={endDay} now={now} currentPrice={parseFloat(price)} coin={coin} />
    </div>
  );
}

// ===== COMPONENT VẼ SÓNG =====
function WaveChart({ data, openPrice, currentPrice }: { data: number[]; openPrice: number; currentPrice: number }) {
  if (!data || data.length === 0 || isNaN(openPrice)) return null;
  const chartData = [...data];
  if (!isNaN(currentPrice)) chartData[chartData.length - 1] = currentPrice;
  const minData = Math.min(...chartData, openPrice);
  const maxData = Math.max(...chartData, openPrice);
  
  const range = maxData - minData || 1;
  const padding = range * 0.2; 
  const min = minData - padding;
  const max = maxData + padding;
  const isGreen = currentPrice >= openPrice;
  const color = isGreen ? "#22c55e" : "#ef4444"; 
  const width = 800; 
  const height = 150;
  
  const getX = (index: number) => (index / (chartData.length - 1)) * width;
  const getY = (val: number) => height - ((val - min) / (max - min)) * height;
  const pathD = `M ${chartData.map((d, i) => `${getX(i)},${getY(d)}`).join(" L ")}`;
  const openY = getY(openPrice);

  return (
    <div style={{ width: "100%", height: "100px", position: "relative" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={0} y1={openY} x2={width} y2={openY} stroke="#9ca3af" strokeDasharray="5,5" strokeWidth="2" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "5px", fontSize: "13px", color: "#6b7280" }}>
        Giá mở cửa: {openPrice.toLocaleString()}
      </div>
    </div>
  );
}

// ===== COMPONENT RENDER MŨI TÊN =====
function ArrowIcon({ types, positionStyle }: { types: string[] | null, positionStyle: any }) {
  if (!types) return null;
  const thickness = "4px";    
  const length = "14px";      
  const headWidth = "4px";    
  const headHeight = "7px";  
  return (
    <div style={positionStyle}>
      {types.map((type, i) => {
        const isUp = type === 'UP';
        const color = isUp ? '#22c55e' : '#ef4444';
        
        return (
          <div key={i} style={{
            width: thickness,
            height: length,
            backgroundColor: color,
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              ...(isUp ? {
                top: `-${headHeight}`,
                borderLeft: `${headWidth} solid transparent`,
                borderRight: `${headWidth} solid transparent`,
                borderBottom: `${headHeight} solid ${color}`
              } : {
                bottom: `-${headHeight}`,
                borderLeft: `${headWidth} solid transparent`,
                borderRight: `${headWidth} solid transparent`,
                borderTop: `${headHeight} solid ${color}`
              })
            }}></div>
          </div>
        );
      })}
    </div>
  );
}

// ===== COMPONENT TIMELINE =====
function Timeline({ title, start, end, now, currentPrice, coin }: { title: string; start: Date; end: Date; now: Date; currentPrice: number; coin: string; }) {
  const [phaseData, setPhaseData] = useState({ 
    max: 0, maxTs: 0, 
    min: Infinity, minTs: 0, 
    open: 0, 
    phaseOpens: [0, 0, 0, 0]
  });
  
  const [arrowStates, setArrowStates] = useState<{
    prev: string[] | null, 
    p1: string[] | null, 
    p2: string[] | null, 
    p3: string[] | null, 
    p4: string[] | null,
    half1: string[] | null, 
    half2: string[] | null 
  }>({
    prev: null, p1: null, p2: null, p3: null, p4: null, half1: null, half2: null
  });

  useEffect(() => {
    let ignore = false; 
    const fetchTimelineData = async () => {
      const durationMs = end.getTime() - start.getTime();
      const days = durationMs / 86400000;
      
      // Chuyển sang dùng API Binance cho Timeline để đảm bảo lịch sử chuẩn xác 100% 
      // và cho phép limit tới 1000 nến, phủ kín cả chu kỳ Năm mà không bị thiếu dữ liệu.
      let interval = "15m";
      if (days > 180) interval = "1d";       // Năm
      else if (days > 90) interval = "12h";  // 6 Tháng
      else if (days > 30) interval = "4h";   // 3 Tháng
      else if (days > 14) interval = "1h";   // 1 Tháng
      else if (days > 5) interval = "15m";   // 1 Tuần
      else if (days > 3) interval = "15m";   // 5 Ngày
      else interval = "5m";                  // <= 3 Ngày
      
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${coin}USDT&interval=${interval}&startTime=${start.getTime()}&endTime=${end.getTime()}&limit=1000`, { cache: "no-store" });
        const json = await res.json();
        
        if (ignore) return; 
        if (Array.isArray(json) && json.length > 0) {
          // Lấy chính xác nến đầu tiên tính từ start.getTime()
          const firstCandle = json.find((c: any) => parseInt(c[0]) >= start.getTime()) || json[0];
          const exactOpen = parseFloat(firstCandle[1]);
          
          let max = -Infinity;
          let maxTs = 0;
          let min = Infinity;
          let minTs = 0;
          
          json.forEach((c: any) => {
            const ts = parseInt(c[0]);
            const high = parseFloat(c[2]);
            const low = parseFloat(c[3]);
            if (high > max) { max = high; maxTs = ts; }
            if (low < min) { min = low; minTs = ts; }
          });
          
          const phaseOpens = [0, 0, 0, 0];
          const pStep = durationMs / 16;
          for (let i = 0; i < 4; i++) {
            const pStartTs = start.getTime() + pStep * (i * 4);
            const pCandle = json.find((c: any) => parseInt(c[0]) >= pStartTs);
            if (pCandle) {
              phaseOpens[i] = parseFloat(pCandle[1]);
            }
          }
          
          setPhaseData({ max, maxTs, min, minTs, open: exactOpen, phaseOpens });

          const getStats = (pStart: number, pEnd: number) => {
            const pData = json.filter((c: any) => {
               const ts = parseInt(c[0]);
               return ts >= pStart && ts < pEnd;
            });
            if (pData.length === 0) return null;
            const o = parseFloat(pData[0][1]);
            const c = parseFloat(pData[pData.length - 1][4]); 
            let h = -Infinity;
            let l = Infinity;
            pData.forEach((cd: any) => {
               const high = parseFloat(cd[2]);
               const low = parseFloat(cd[3]);
               if (high > h) h = high;
               if (low < l) l = low;
            });
            return { open: o, close: c, high: h, low: l };
          };

          const calcArr = (stats: any) => {
            if (!stats) return null;
            const { open, close, high, low } = stats;
            if (close >= open) { 
              const threshold = open + (high - open) * 0.5;
              return close >= threshold ? ['UP', 'UP'] : ['DOWN', 'UP'];
            } else { 
              const threshold = open - (open - low) * 0.5;
              return close <= threshold ? ['DOWN', 'DOWN'] : ['UP', 'DOWN'];
            }
          };

          // Đối với mũi tên prev (kỳ trước), fetch riêng 1 request 
          let prevArr = null;
          try {
            const prevRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${coin}USDT&interval=${interval}&startTime=${start.getTime() - durationMs}&endTime=${start.getTime()}&limit=1000`);
            const prevJson = await prevRes.json();
            if (Array.isArray(prevJson) && prevJson.length > 0) {
              const o = parseFloat(prevJson[0][1]);
              const c = parseFloat(prevJson[prevJson.length - 1][4]); 
              let h = -Infinity; let l = Infinity;
              prevJson.forEach((cd: any) => {
                const high = parseFloat(cd[2]);
                const low = parseFloat(cd[3]);
                if (high > h) h = high;
                if (low < l) l = low;
              });
              prevArr = calcArr({ open: o, close: c, high: h, low: l });
            }
          } catch (e) {}

          setArrowStates({
            prev: prevArr,
            p1: calcArr(getStats(start.getTime(), start.getTime() + pStep * 4)),
            p2: calcArr(getStats(start.getTime() + pStep * 4, start.getTime() + pStep * 8)),
            p3: calcArr(getStats(start.getTime() + pStep * 8, start.getTime() + pStep * 12)),
            p4: calcArr(getStats(start.getTime() + pStep * 12, end.getTime())),
            half1: calcArr(getStats(start.getTime(), start.getTime() + pStep * 8)),
            half2: calcArr(getStats(start.getTime() + pStep * 8, end.getTime())),
          });
        }
      } catch (error) {
        console.error("Lỗi fetch timeline data:", error);
      }
    };
    
    fetchTimelineData();
    return () => { ignore = true; };
  }, [start, end, coin]); 

  const o = phaseData.open;
  const c = currentPrice;
  const h = Math.max(phaseData.max, isNaN(c) ? -Infinity : c);
  const l = Math.min(phaseData.min, isNaN(c) ? Infinity : c);
  let headerArrows: string[] | null = null;
  let isUpPrice = true;
  
  if (o > 0 && !isNaN(c) && c > 0) {
    isUpPrice = c >= o;
    if (c >= o) {
      const threshold = o + (h - o) * 0.5;
      headerArrows = c >= threshold ? ['UP', 'UP'] : ['DOWN', 'UP'];
    } else {
      const threshold = o - (o - l) * 0.5;
      headerArrows = c <= threshold ? ['DOWN', 'DOWN'] : ['UP', 'DOWN'];
    }
  }

  let progress = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
  progress = Math.max(0, Math.min(100, progress)); 
  
  const totalTicks = 16;
  const step = (end.getTime() - start.getTime()) / totalTicks;
  const phases = [
    { label: "1/4 đầu", color: "#93c5fd", range: [0, 4] },
    { label: "1/4 thứ 2", color: "#86efac", range: [4, 8] },
    { label: "1/4 thứ 3", color: "#fef08a", range: [8, 12] },
    { label: "1/4 cuối cùng", color: "#f9a8d4", range: [12, 16] },
  ];
  
  const getPhaseArrows = (idx: number) => {
    if (idx === 0) return arrowStates.p1;
    if (idx === 1) return arrowStates.p2;
    if (idx === 2) return arrowStates.p3;
    if (idx === 3) return arrowStates.p4;
    return null;
  };

  const formatVNDate = (date: Date) => date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });
  const formatVNTime = (date: Date) => date.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={styles.timelineRow}>
      <div style={styles.timelineHeader}>
        <div style={{ ...styles.label, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span>{title} {o > 0 ? `- Mở cửa: ${o.toLocaleString()}` : ""}</span>
          
          {headerArrows && o > 0 && (
            <>
              <span style={{ color: "red", fontWeight: "bold" }}>-</span>
              <ArrowIcon types={headerArrows} positionStyle={{ display: 'flex', gap: '6px', alignItems: 'center' }} />
              <span style={{ color: "red", fontWeight: "bold" }}>-</span>
              <span style={{ color: isUpPrice ? "#22c55e" : "#ef4444" }}>{c.toLocaleString()} USDT</span>
            </>
          )}
        </div>
      </div>

      <div style={styles.responsiveGrid}>
        {phases.map((phase, phaseIdx) => {
          const [startIdx, endIdx] = phase.range;
          const phaseStartPercent = (startIdx / totalTicks) * 100;
          const phaseEndPercent = (endIdx / totalTicks) * 100;
          
          const phaseStartTs = start.getTime() + step * startIdx;
          const phaseEndTs = start.getTime() + step * endIdx;
          const isNowInPhase = progress >= phaseStartPercent && (progress < phaseEndPercent || (phaseIdx === 3 && progress === 100));
          
          let relativeProgress = ((progress - phaseStartPercent) / (phaseEndPercent - phaseStartPercent)) * 100;
          relativeProgress = Math.max(0, Math.min(100, relativeProgress));
          const isMaxInPhase = phaseData.maxTs >= phaseStartTs && (phaseData.maxTs < phaseEndTs || (phaseIdx === 3 && phaseData.maxTs <= phaseEndTs));
          const isMinInPhase = phaseData.minTs >= phaseStartTs && (phaseData.minTs < phaseEndTs || (phaseIdx === 3 && phaseData.minTs <= phaseEndTs));
          const maxRelative = isMaxInPhase ? ((phaseData.maxTs - phaseStartTs) / (phaseEndTs - phaseStartTs)) * 100 : 0;
          const minRelative = isMinInPhase ? ((phaseData.minTs - phaseStartTs) / (phaseEndTs - phaseStartTs)) * 100 : 0;
          
          const ticks = [];
          for (let i = startIdx; i <= endIdx; i++) {
            const t = new Date(start.getTime() + step * i);
            ticks.push({
              percent: ((i - startIdx) / (endIdx - startIdx)) * 100,
              label: formatVNDate(t),
              hour: formatVNTime(t),
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
                  {phaseIdx === 0 && <ArrowIcon types={arrowStates.prev} positionStyle={styles.prevArrowsWrapper} />}
                  {phaseIdx === 0 && <ArrowIcon types={arrowStates.half1} positionStyle={styles.halfArrowsWrapper} />}
                  {phaseIdx === 2 && <ArrowIcon types={arrowStates.half2} positionStyle={styles.halfArrowsWrapper} />}
                  
                  {isMaxInPhase && o > 0 && (
                    <>
                      <div style={{ ...styles.maxDot, left: `${maxRelative}%` }}></div>
                      <div style={{ ...styles.maxText, left: `${maxRelative}%` }}>MAX {phaseData.max.toLocaleString()}</div>
                    </>
                  )}
                  <div style={styles.phaseText}>
                    {phase.label} {phaseData.phaseOpens[phaseIdx] > 0 ? `- Mở cửa: ${phaseData.phaseOpens[phaseIdx].toLocaleString()}` : ""}
                  </div>
                  
                  <ArrowIcon types={getPhaseArrows(phaseIdx)} positionStyle={styles.phaseArrowsWrapper} />
                  
                  {isMinInPhase && o > 0 && (
                    <>
                      <div style={{ ...styles.minDot, left: `${minRelative}%` }}></div>
                      <div style={{ ...styles.minText, left: `${minRelative}%` }}>MIN {phaseData.min.toLocaleString()}</div>
                    </>
                  )}
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

// ===== PHẦN STYLE =====
const styles: any = {
  coinSelect: {
    padding: "4px 10px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "6px",
    border: "2px solid #e5e7eb",
    background: "#f8fafc",
    color: "#333",
    cursor: "pointer",
    outline: "none",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  introBox: {
    marginBottom: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "0 5px"
  },
  simpleText: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#2563eb", 
  },
  simpleLink: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#2563eb",
    textDecoration: "none", 
    cursor: "pointer"
  },
  container: { 
    background: "#fafafa", 
    minHeight: "100vh", 
    paddingBottom: "50px", 
    fontFamily: "Arial, sans-serif",
    WebkitFontSmoothing: "antialiased" 
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
    border: "3px solid #cbd5e1" 
  },
  title: { 
    fontSize: "clamp(22px, 5vw, 36px)", 
    fontWeight: "900", 
    margin: 0,
    color: "#111"
  },
  qkay: { color: "#2563eb" },
  time: { color: "#2563eb", fontSize: "14px", marginTop: "5px" },
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
  
  timelineHeader: { 
    textAlign: "center",
    marginBottom: "40px",
  },
  label: { color: "red", fontWeight: "bold", fontSize: "20px" },
  
  responsiveGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "45px 10px" },
  phaseContainer: { marginBottom: "30px", marginTop: "30px" },
  timelineContent: { position: "relative", width: "100%" },
  bar: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #94a3b8", position: "relative" },
  phaseText: { color: "#2563eb", fontWeight: "bold", fontSize: "12px", zIndex: 1, textAlign: "center", padding: "0 5px" },
  
  line: { position: "absolute", top: -5, bottom: -5, width: 2, background: "#ef4444", zIndex: 5, borderRadius: "2px" },
  prevArrowsWrapper: { position: "absolute", left: "-19px", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "6px", zIndex: 10 },
  phaseArrowsWrapper: { position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "6px", zIndex: 10 },
  halfArrowsWrapper: { position: "absolute", right: "19px", top: "-35px", transform: "translateX(50%)", display: "flex", gap: "6px", zIndex: 10 },
  tick: { position: "absolute", bottom: "100%", transform: "translate(-50%, -2px)", fontSize: "11.5px", fontWeight: "600", color: "#444", textAlign: "center", whiteSpace: "nowrap", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 3 },
  dot: { width: "4px", height: "4px", background: "#777", borderRadius: "50%", marginTop: "4px" },
  rangeTextContainer: { display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#444", marginTop: "6px", fontWeight: "600" },
  now: { position: "absolute", top: "100%", transform: "translate(-50%, 6px)", background: "#ef4444", color: "#fff", fontSize: "10px", padding: "3px 6px", borderRadius: "4px", zIndex: 6, fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" },
  maxDot: { position: "absolute", top: "-6px", transform: "translateX(-50%)", width: "12px", height: "12px", background: "#22c55e", borderRadius: "50%", border: "2px solid #fff", zIndex: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  maxText: { position: "absolute", bottom: "calc(100% + 45px)", transform: "translateX(-50%)", color: "#16a34a", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", zIndex: 10, background: "rgba(255,255,255,0.85)", padding: "2px 6px", borderRadius: "4px" },
  minDot: { position: "absolute", bottom: "-6px", transform: "translateX(-50%)", width: "12px", height: "12px", background: "#ef4444", borderRadius: "50%", border: "2px solid #fff", zIndex: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  minText: { position: "absolute", top: "calc(100% + 25px)", transform: "translateX(-50%)", color: "#dc2626", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", zIndex: 10, background: "rgba(255,255,255,0.85)", padding: "2px 6px", borderRadius: "4px" },
};
