import { Component, type ReactNode } from 'react';

/** 예기치 않은 오류가 나도 빈 화면 대신 복구 화면을 보여 준다(깨진 저장 때문에 시작조차 못 하는 경우 포함) */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('마나 마켓 오류', error); }
  render() {
    if (!this.state.error) return this.props.children;
    const reset = () => { try { localStorage.removeItem('mana-market-v1'); } catch { /* 저장소를 못 쓰는 환경 */ } location.reload(); };
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[#35244a] p-5">
        <div className="w-full max-w-[360px] border-[2.5px] border-ink bg-white p-5 shadow-[5px_5px_0_#000]">
          <h1 className="m-0 mb-2 font-display text-[22px]">앗, 문제가 생겼어요</h1>
          <p className="m-0 text-[13px] font-bold leading-relaxed text-ink2">화면을 그리다가 오류가 났어요. 다시 시도해 보고, 계속 안 되면 저장을 초기화해 새로 시작할 수 있어요. 저장 초기화는 되돌릴 수 없어요.</p>
          <pre className="my-3 max-h-24 overflow-auto bg-[#f7f5ff] p-2 text-[10.5px] text-ink2">{String(this.state.error.message).slice(0, 300)}</pre>
          <div className="flex gap-2">
            <button onClick={() => location.reload()} className="btn3d h-11 flex-1 text-[14px]" style={{ ['--c' as string]: '#ffc13b', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>다시 시도</button>
            <button onClick={() => { if (confirm('저장을 지우고 처음부터 시작할까요? 되돌릴 수 없어요.')) reset(); }} className="btn3d h-11 flex-1 text-[14px]" style={{ ['--c' as string]: '#fff', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>저장 초기화</button>
          </div>
        </div>
      </div>
    );
  }
}
