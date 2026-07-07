"use client";

import { useEffect, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Text } from "react-konva";

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

/** A table plus the derived, render-ready info the canvas needs — no db/engine types leak in here. */
export interface PlanTableView {
  id: string;
  shape: string;
  capacity: number;
  /** Image-natural pixel coordinates (same space as the Plan 2 editor). */
  x: number;
  y: number;
  guestNames: string[];
}

export interface PlanCanvasProps {
  imageUrl?: string;
  tables: PlanTableView[];
  /** Table ids currently over capacity — rendered in red. */
  overCapacityIds: string[];
  maxWidth: number;
  maxHeight: number;
}

export default function PlanCanvas({
  imageUrl,
  tables,
  overCapacityIds,
  maxWidth,
  maxHeight,
}: PlanCanvasProps) {
  const image = useImageElement(imageUrl);

  // displayScale maps image-natural pixels -> on-screen (display) pixels, same
  // convention as FloorPlanCanvas (Plan 2). Table x/y here are always natural.
  const naturalWidth = image?.naturalWidth || maxWidth;
  const naturalHeight = image?.naturalHeight || maxHeight;
  const displayScale = image ? Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight) : 1;
  const stageWidth = image ? naturalWidth * displayScale : maxWidth;
  const stageHeight = image ? naturalHeight * displayScale : maxHeight;

  const overCapacitySet = new Set(overCapacityIds);

  return (
    <Stage width={stageWidth} height={stageHeight} style={{ border: "1px solid #ccc" }}>
      <Layer>
        {image && (
          <KonvaImage image={image} width={stageWidth} height={stageHeight} listening={false} />
        )}
      </Layer>
      <Layer listening={false}>
        {tables.map((t) => (
          <TableShape
            key={t.id}
            table={t}
            displayScale={displayScale}
            overCapacity={overCapacitySet.has(t.id)}
          />
        ))}
      </Layer>
    </Stage>
  );
}

function TableShape({
  table,
  displayScale,
  overCapacity,
}: {
  table: PlanTableView;
  displayScale: number;
  overCapacity: boolean;
}) {
  const stroke = overCapacity ? "#dc2626" : "#111827";
  const strokeWidth = overCapacity ? 3 : 1.5;
  const fill = overCapacity ? "#fee2e2" : "#fef3c7";

  const displayX = table.x * displayScale;
  const displayY = table.y * displayScale;
  const radius = ROUND_RADIUS * displayScale;
  const rectWidth = RECT_WIDTH * displayScale;
  const rectHeight = RECT_HEIGHT * displayScale;
  const labelWidth = 130 * displayScale;

  const occupancyLabel = `${table.guestNames.length}/${table.capacity}`;
  const namesLabel = table.guestNames.join(", ");

  return (
    <>
      {table.shape === "round" ? (
        <Circle
          x={displayX}
          y={displayY}
          radius={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <Rect
          x={displayX}
          y={displayY}
          offsetX={rectWidth / 2}
          offsetY={rectHeight / 2}
          width={rectWidth}
          height={rectHeight}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      <Text
        x={displayX - labelWidth / 2}
        y={displayY - 10}
        width={labelWidth}
        align="center"
        text={occupancyLabel}
        fontSize={14}
        fontStyle="bold"
        fill={overCapacity ? "#dc2626" : "#111827"}
      />
      <Text
        x={displayX - labelWidth / 2}
        y={displayY + 8}
        width={labelWidth}
        align="center"
        text={namesLabel}
        fontSize={10}
        fill="#374151"
        wrap="word"
      />
    </>
  );
}
