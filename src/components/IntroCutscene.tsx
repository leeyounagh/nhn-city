"use client";
// 첫 진입 스토리 컷신. public/intro/ 의 픽셀 프레임을 스토리보드 타이밍대로 순서 재생한다.
import { useEffect, useState } from "react";

// 흩날리는 재 파티클 (index 기반 결정론 배치 — 렌더 순수성 유지).
const ASH_FLAKES = Array.from({ length: 26 }, (_, idx) => ({
  left: (idx * 37) % 100,
  size: 1 + (idx % 3),
  delay: (idx * 0.7) % 8,
  dur: 7 + (idx % 7),
}));

interface Scene {
  image: string; // public/intro/ 아래 프레임 경로 (여기 파일을 갈아끼운다)
  ms: number; // 이 컷을 보여줄 시간
  text: string; // 자막 (빈 문자열이면 이미지만)
}

// 스토리보드 「망한 도시의 후계자」. text·ms·image 경로는 자유롭게 편집. (05-receive·06-book-blur·07-book-read·09-will 컷 폐기)
const SCENES: Scene[] = [
  { image: "/intro/01-skyline.png", ms: 5000, text: "적의 침략으로 도시가 무너지던 밤." },
  { image: "/intro/02-travelers.png", ms: 7000, text: "" },
  { image: "/intro/03-mentor.png", ms: 8000, text: "퇴직기사는 나라의 국보 「마법의 책」을 품고 후계자와 함께 탈출했다." },
  { image: "/intro/04-relic.png", ms: 3000, text: "「이 책은… 소문 속 진실을 읽어내는 유물이다.」" },
  { image: "/intro/08-awaken.png", ms: 5000, text: "수년의 유랑 끝, 폐허가 된 고향으로 돌아온다." },
  { image: "/intro/10-journey.png", ms: 5000, text: "" },
  { image: "/intro/11-firstlight.png", ms: 5000, text: "무너진 옛 도시에 첫 발을 내딛는다." },
  { image: "/intro/12-merchant.png", ms: 3000, text: "「상인을 추적하라. 거래로 도시를 되세운다.」" },
  { image: "/intro/13-haggle.png", ms: 3000, text: "" },
];

const TITLE_IMAGE = "/intro/title.png";
const START_BUTTON = "/intro/start-button.png";

export function IntroCutscene({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const atTitle = i >= SCENES.length; // 마지막 = 타이틀 카드

  useEffect(() => {
    if (atTitle) return;
    const t = setTimeout(() => setI((v) => v + 1), SCENES[i].ms);
    return () => clearTimeout(t);
  }, [i, atTitle]);

  const advance = () => setI((v) => Math.min(v + 1, SCENES.length));
  const scene = SCENES[i];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-black text-stone-100"
      onClick={atTitle ? undefined : advance}
    >
      {atTitle ? (
        <TitleCard onFinish={onFinish} />
      ) : (
        <SceneView key={i} scene={scene} />
      )}

      <Ash />

      {/* 컨트롤 */}
      <div className="absolute bottom-6 z-20 flex items-center gap-4">
        {!atTitle && (
          <>
            <div className="flex gap-1.5">
              {SCENES.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 w-1.5 rounded-full ${idx <= i ? "bg-amber-300" : "bg-stone-600"}`}
                />
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
              className="rounded border border-stone-600 px-3 py-1 text-xs text-stone-300 hover:bg-stone-800"
            >
              다음 ▸
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFinish();
          }}
          className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-300"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}

// 한 컷 = 프레임 이미지 + (선택) 자막. 이미지가 아직 없으면 어두운 배경만.
function SceneView({ scene }: { scene: Scene }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <>
      {imgOk && (
        /* eslint-disable-next-line @next/next/no-img-element -- 사용자 교체용 정적 프레임, 최적화 불필요 */
        <img
          src={scene.image}
          alt=""
          onError={() => setImgOk(false)}
          className="lc-fade-in absolute inset-0 h-full w-full object-contain"
        />
      )}
      {/* 자막 가독성용 하단 스크림 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
      {scene.text && (
        <p className="lc-fade-up absolute bottom-24 z-10 max-w-2xl px-6 text-center text-lg leading-relaxed text-stone-100 sm:text-xl">
          {scene.text}
        </p>
      )}
    </>
  );
}

function TitleCard({ onFinish }: { onFinish: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const [btnOk, setBtnOk] = useState(true);

  // 타이틀 이미지엔 카피(LAST CITY·부제)가 이미 박혀 있으니 그 위에 버튼만 얹는다.
  if (imgOk) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- 사용자 교체용 정적 프레임, 최적화 불필요 */}
        <img
          src={TITLE_IMAGE}
          alt=""
          onError={() => setImgOk(false)}
          className="lc-fade-in absolute inset-0 h-full w-full object-contain"
        />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-end pb-[14%]">
          <button onClick={onFinish} className="lc-fade-up transition hover:brightness-110" style={{ animationDelay: "0.4s" }}>
            {btnOk ? (
              /* eslint-disable-next-line @next/next/no-img-element -- 사용자 교체용 정적 버튼, 최적화 불필요 */
              <img
                src={START_BUTTON}
                alt="게임 시작"
                onError={() => setBtnOk(false)}
                className="h-auto w-[85vw] max-w-md drop-shadow-lg"
              />
            ) : (
              <span className="rounded-full bg-amber-500 px-8 py-3 text-base font-semibold text-stone-950">여정 시작</span>
            )}
          </button>
        </div>
      </>
    );
  }

  // 폴백: 타이틀 이미지가 없을 때 CSS 텍스트 + 버튼.
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="lc-fade-in mb-4 text-sm tracking-widest text-stone-400">소문을 읽고, 거래로 도시를 다시 세운다</p>
        <h1 className="lc-title text-5xl font-bold text-amber-200 sm:text-6xl">Ashen Kingdom</h1>
        <button
          onClick={onFinish}
          className="lc-fade-up mt-10 rounded-full bg-amber-500 px-8 py-3 text-base font-semibold text-stone-950 transition hover:bg-amber-400"
          style={{ animationDelay: "0.6s" }}
        >
          여정 시작
        </button>
      </div>
    </>
  );
}

function Ash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
      {ASH_FLAKES.map((f, idx) => (
        <span
          key={idx}
          className="lc-ash"
          style={{
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
