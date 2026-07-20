'use client';

type ContentImagePositionControlsProps = {
  x: number;
  y: number;
  scale: number;
  onPositionChange: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
};

export default function ContentImagePositionControls({
  x,
  y,
  scale,
  onPositionChange,
  onScaleChange,
}: ContentImagePositionControlsProps) {
  return (
    <div className="grid gap-4">
      <div>
        <label className="fac-label">Largura</label>
        <input
          type="range"
          min="0"
          max="100"
          value={x}
          onChange={(event) => onPositionChange(Number.parseInt(event.target.value, 10), y)}
          className="w-full"
        />
        <p className="mt-1 text-[12px] text-muted-foreground">{x}%</p>
      </div>

      <div>
        <label className="fac-label">Altura</label>
        <input
          type="range"
          min="0"
          max="100"
          value={y}
          onChange={(event) => onPositionChange(x, Number.parseInt(event.target.value, 10))}
          className="w-full"
        />
        <p className="mt-1 text-[12px] text-muted-foreground">{y}%</p>
      </div>

      <div>
        <label className="fac-label">Zoom</label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={scale}
          onChange={(event) => onScaleChange(Number.parseFloat(event.target.value))}
          className="w-full"
        />
        <p className="mt-1 text-[12px] text-muted-foreground">{scale.toFixed(1)}x</p>
      </div>
    </div>
  );
}
