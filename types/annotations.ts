export enum AnnotationType {
  TEXT = 'text',
  HIGHLIGHT = 'highlight',
  UNDERLINE = 'underline',
  SQUARE = 'square',
  CIRCLE = 'circle',
  FREETEXT = 'freetext',
  STRIKEOUT = 'strikeout',
  POLYGON = 'polygon'
}

export interface AnnotationButton {
  type: AnnotationType;
  icon: string;
  label: string;
}

export const ANNOTATION_BUTTONS: AnnotationButton[] = [
  {
    type: AnnotationType.TEXT,
    icon: "📝",
    label: 'Text Note'
  },
  {
    type: AnnotationType.HIGHLIGHT,
    icon: '🌟',
    label: 'Highlight'
  },
  {
    type: AnnotationType.UNDERLINE,
    icon: '➖',
    label: 'Underline'
  },
  {
    type: AnnotationType.SQUARE,
    icon: '⬜',
    label: 'Square'
  },
  {
    type: AnnotationType.CIRCLE,
    icon: '⭕',
    label: 'Circle'
  },
  {
    type: AnnotationType.FREETEXT,
    icon: '📝',
    label: 'Free Text'
  },
  {
    type: AnnotationType.STRIKEOUT,
    icon: '✂️',
    label: 'Strike Out'
  },
  {
    type: AnnotationType.POLYGON,
    icon: '📐',
    label: 'Polygon'
  }
];