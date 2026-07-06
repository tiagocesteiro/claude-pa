"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { EditorTable } from "@/lib/floorplan/editorState";
import type { Point } from "@/lib/floorplan/geometry";

const ROUND_RADIUS = 40;
const RECT_WIDTH = 110;
const RECT_HEIGHT = 60;

function useImageElement(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    if (!src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the image source clears
      setImage(undefined);
      return;
    }
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, [src]);

  return image;
}

export type CanvasMode = "select" | "add-table" | "calibrate";

export interface FloorPlanCanvasProps {
  imageUrl?: string;
  tables: EditorTable[];
  selectedId: string | null;
  mode: CanvasMode;
  calibrationPoints?: Point[];
  width: number;
  height: number;
  onAddTable: (at: Point) => void;
  onMoveTable: (id: string, to: Point) => void;
  onSelect: (id: string | null) => void;
  onCalibrateClick?: (at: Point) => void;
}

export default function FloorPlanCanvas({
  imageUrl,
  tables,
  selectedId,
  mode,
  calibrationPoints = [],
  width,
  height,
  onAddTable,
  onMoveTable,
  onSelect,
  onCalibrateClick,
}: FloorPlanCanvasProps) {
  const image = useImageElement(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    if (e.target !== e.target.getStage()) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    if (mode === "add-table") {
      onAddTable(pos);
      return;
    }
    if (mode === "calibrate") {
      onCalibrateClick?.(pos);
      return;
    }
    onSelect(null);
  }

  const cursor = mode === "add-table" ? "copy" : mode === "calibrate" ? "crosshair" : "default";

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onClick={handleStageClick}
      style={{ border: "1px solid #ccc", cursor }}
    >
      <Layer>
        {image && <KonvaImage image={image} width={width} height={height} listening={false} />}
      </Layer>
      <Layer>
        {tables.map((t) => (
          <TableShape
            key={t.id}
            table={t}
            isSelected={t.id === selectedId}
            onSelect={() => onSelect(t.id)}
            onDragEnd={(e) => onMoveTable(t.id, { x: e.target.x(), y: e.target.y() })}
          />
        ))}
      </Layer>
      <Layer listening={false}>
        {calibrationPoints.length === 2 && (
          <Line
            points={[
              calibrationPoints[0].x,
              calibrationPoints[0].y,
              calibrationPoints[1].x,
              calibrationPoints[1].y,
            ]}
            stroke="#059669"
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}
        {calibrationPoints.map((p, i) => (
          <Circle key={i} x={p.x} y={p.y} radius={5} fill="#059669" />
        ))}
      </Layer>
    </Stage>
  );
}

function TableShape({
  table,
  isSelected,
  onSelect,
  onDragEnd,
}: {
  table: EditorTable;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
}) {
  const stroke = isSelected ? "#2563eb" : table.fixed ? "#dc2626" : "#111827";
  const strokeWidth = isSelected ? 3 : 1.5;
  const fill = "#fef3c7";

  return (
    <>
      {table.shape === "round" ? (
        <Circle
          x={table.x}
          y={table.y}
          radius={ROUND_RADIUS}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
        />
      ) : (
        <Rect
          x={table.x}
          y={table.y}
          offsetX={RECT_WIDTH / 2}
          offsetY={RECT_HEIGHT / 2}
          width={RECT_WIDTH}
          height={RECT_HEIGHT}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
        />
      )}
      <Text
        x={table.x - 30}
        y={table.y - 8}
        width={60}
        align="center"
        text={String(table.capacity)}
        fontSize={16}
        listening={false}
      />
    </>
  );
}
