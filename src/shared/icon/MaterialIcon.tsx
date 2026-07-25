// 재료 아이콘. public/materials/{id}.png 를 이름 옆 작은 이미지로 표시한다.
export function MaterialIcon({ id, className = "h-4 w-4" }: { id: string; className?: string }) {
  return (
    <img
      src={`/materials/${id}.png`}
      alt=""
      draggable={false}
      className={`inline-block shrink-0 object-contain align-text-bottom ${className}`}
    />
  );
}
