import styled from "styled-components";

export const ButtonContainer = styled.div`
  display: inline-flex;
  padding: 12px 24px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 1000px;
  position: relative;
  min-width: 120px;
  height: 48px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  transform: translateY(0px) translateX(0px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);

  &:hover {
    transform: translateY(-1px) translateX(0px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0px) translateX(0px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

export const Background = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 1000px;
  overflow: hidden;
`;

export const BlurContainer = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 1000px;
  backdrop-filter: blur(3px);
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
  transform: translateZ(0);
  
  /* Simplified single glass effect - no pseudo-elements */
  box-shadow: 
    inset 1px 1px 2px rgba(255, 255, 255, 0.3),
    inset -1px -1px 2px rgba(0, 0, 0, 0.05);
`;

export const MaskContainer = styled.div`
  display: none;
`;

export const MaskShape = styled.div`
  display: none;
`;

export const BlurEffect = styled.div`
  display: none;
`;

export const FillLayer = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 1000px;
  position: absolute;
  top: 0;
  left: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.08) 100%
  );
  box-shadow:
    inset 1px 1px 2px rgba(255, 255, 255, 0.2),
    inset -1px -1px 2px rgba(0, 0, 0, 0.05);
  will-change: transform;
  transform: translateZ(0);
`;

export const GlassEffectLayer = styled.div`
  display: none;
`;

export const LabelContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 10;
  pointer-events: none;
  transform: translateX(0px);
`;

export const LabelSymbol = styled.div`
  width: 100%;
  text-align: center;
  position: relative;
`;

export const LabelText = styled.div`
  color: #333;
  font-weight: 500;
  font-size: 14px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  transform: translateX(0px);
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;

  @media (max-width: 991px) {
    font-size: 13px;
  }
  @media (max-width: 640px) {
    font-size: 12px;
  }
`;
