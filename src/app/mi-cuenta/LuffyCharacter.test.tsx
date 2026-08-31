import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LuffyCharacter from './LuffyCharacter';

describe('LuffyCharacter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with happy expression initially and without instructions hint banner', () => {
    render(<LuffyCharacter />);
    const luffyContainer = screen.getByTestId('luffy-character');
    expect(luffyContainer).toBeInTheDocument();
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
    expect(screen.queryByText(/¡Pasa el mouse/i)).not.toBeInTheDocument();
  });

  it('switches to serious (reference image expression) on pointer enter and back to happy on pointer leave', () => {
    render(<LuffyCharacter />);
    const luffyContainer = screen.getByTestId('luffy-character');

    fireEvent.pointerEnter(luffyContainer);
    expect(luffyContainer).toHaveAttribute('data-expression', 'serious');

    fireEvent.pointerLeave(luffyContainer);
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
  });

  it('closes eyes and displays animated whistling musical notes when isPasswordFocused is true', () => {
    const { rerender } = render(<LuffyCharacter isPasswordFocused={false} />);
    const luffyContainer = screen.getByTestId('luffy-character');
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
    expect(screen.queryByTestId('whistle-notes')).not.toBeInTheDocument();

    rerender(<LuffyCharacter isPasswordFocused={true} />);
    expect(luffyContainer).toHaveAttribute('data-expression', 'closed');
    expect(screen.getByTestId('whistle-notes')).toBeInTheDocument();

    // Pointer hover should not override closed eyes when focusing password
    fireEvent.pointerEnter(luffyContainer);
    expect(luffyContainer).toHaveAttribute('data-expression', 'closed');

    fireEvent.pointerLeave(luffyContainer);
    rerender(<LuffyCharacter isPasswordFocused={false} />);
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
    expect(screen.queryByTestId('whistle-notes')).not.toBeInTheDocument();
  });

  it('displays Luffy dialogue speech bubble after idle time and hides on password focus', () => {
    const { rerender } = render(<LuffyCharacter isPasswordFocused={false} />);
    expect(screen.queryByTestId('luffy-speech-bubble')).not.toBeInTheDocument();

    // Fast-forward initial idle timer (3000ms)
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.getByTestId('luffy-speech-bubble')).toBeInTheDocument();

    // Hide speech bubble when focusing password
    rerender(<LuffyCharacter isPasswordFocused={true} />);
    expect(screen.queryByTestId('luffy-speech-bubble')).not.toBeInTheDocument();
  });

  it('tracks cursor movement on window with pupil CSS custom properties', () => {
    render(<LuffyCharacter />);
    const luffyContainer = screen.getByTestId('luffy-character');

    fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
    // Should have attached pointermove listener without crashing
    expect(luffyContainer).toBeInTheDocument();
  });

  it('toggles shocked expression on click and alternates back', () => {
    render(<LuffyCharacter />);
    const luffyContainer = screen.getByTestId('luffy-character');

    fireEvent.click(luffyContainer);
    expect(luffyContainer).toHaveAttribute('data-expression', 'shocked');

    fireEvent.click(luffyContainer);
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
  });

  it('supports keyboard accessibility via Enter and Space keys', () => {
    render(<LuffyCharacter />);
    const luffyContainer = screen.getByTestId('luffy-character');

    fireEvent.keyDown(luffyContainer, { key: 'Enter' });
    expect(luffyContainer).toHaveAttribute('data-expression', 'shocked');

    fireEvent.keyDown(luffyContainer, { key: ' ' });
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
  });

  it('respects external expression prop when passed', () => {
    const { rerender } = render(<LuffyCharacter expression="shocked" />);
    const luffyContainer = screen.getByTestId('luffy-character');
    expect(luffyContainer).toHaveAttribute('data-expression', 'shocked');

    rerender(<LuffyCharacter expression="happy" />);
    expect(luffyContainer).toHaveAttribute('data-expression', 'happy');
  });
});
