'use client';

import { Component, ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class GameErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Game render error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f5f6ff] flex items-center justify-center p-6 text-indigo-950">
          <div className="max-w-lg rounded-3xl border-4 border-rose-100 bg-white p-6 shadow-xl">
            <h1 className="text-xl font-black text-rose-600 mb-2">Erro ao carregar a partida</h1>
            <p className="text-sm font-semibold text-slate-600">{this.state.error.message || 'Erro inesperado no jogo.'}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
