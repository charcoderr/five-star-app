import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { colours } from '../utils/theme';
import { MonthlyScore } from '../hooks/useTrends';

const CHART_W = 320;
const CHART_H = 140;
const BOTTOM_PAD = 24;   // space for month labels
const LEFT_PAD = 28;     // space for y-axis labels
const BAR_GAP = 4;

interface TrendChartProps {
  data: MonthlyScore[];
  benchmark?: number | null;
  width?: number;
}

export function TrendChart({ data, benchmark, width = CHART_W }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Not enough data yet — check back after more reports are reviewed.
        </Text>
      </View>
    );
  }

  const drawW = width - LEFT_PAD;
  const drawH = CHART_H - BOTTOM_PAD;
  const barSlot = drawW / data.length;
  const barW = Math.max(Math.min(barSlot - BAR_GAP * 2, 36), 6);
  const benchmarkY = benchmark != null ? drawH - (benchmark / 5) * drawH : null;

  return (
    <View>
      <Svg width={width} height={CHART_H}>
        {/* Grid lines + Y axis labels */}
        {[0, 1, 2, 3, 4, 5].map(val => {
          const y = drawH - (val / 5) * drawH;
          return (
            <G key={val}>
              <SvgText
                x={LEFT_PAD - 5}
                y={y + 4}
                fontSize={9}
                fill={colours.textMuted}
                textAnchor="end"
              >
                {val}
              </SvgText>
              <Line
                x1={LEFT_PAD}
                y1={y}
                x2={width}
                y2={y}
                stroke={colours.border}
                strokeWidth={0.5}
              />
            </G>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max((d.avgScore / 5) * drawH, 3);
          const x = LEFT_PAD + i * barSlot + (barSlot - barW) / 2;
          const y = drawH - barH;
          const color = d.avgScore < 2.5 ? colours.scoreFair
            : d.avgScore < 3.5 ? colours.scoreGood
            : colours.gold;
          return (
            <G key={d.month}>
              <Rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.9} />
              {barH > 20 && (
                <SvgText
                  x={x + barW / 2}
                  y={y + 12}
                  fontSize={9}
                  fill={colours.charcoalDark}
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {d.avgScore.toFixed(1)}
                </SvgText>
              )}
              <SvgText
                x={x + barW / 2}
                y={drawH + BOTTOM_PAD - 6}
                fontSize={10}
                fill={colours.textSecondary}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}

        {/* Benchmark dashed line */}
        {benchmarkY != null && (
          <G>
            <Line
              x1={LEFT_PAD}
              y1={benchmarkY}
              x2={width}
              y2={benchmarkY}
              stroke={colours.scoreGood}
              strokeWidth={1.5}
              strokeDasharray="4,3"
            />
            <SvgText
              x={LEFT_PAD + 4}
              y={benchmarkY - 4}
              fontSize={9}
              fill={colours.scoreGood}
            >
              avg {benchmark!.toFixed(1)}
            </SvgText>
          </G>
        )}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colours.gold }]} />
          <Text style={styles.legendText}>Your score</Text>
        </View>
        {benchmark != null && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDash, { backgroundColor: colours.scoreGood }]} />
            <Text style={styles.legendText}>Platform avg</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 16 },
  emptyText: { fontSize: 13, color: colours.textMuted, lineHeight: 18, fontStyle: 'italic' },
  legend: { flexDirection: 'row', gap: 16, paddingTop: 8, paddingLeft: LEFT_PAD },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDash: { width: 16, height: 2, borderRadius: 1 },
  legendText: { fontSize: 11, color: colours.textSecondary },
});
