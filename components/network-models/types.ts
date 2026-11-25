export type MediumKind = "copper" | "fiber" | "wifi";

export type ScenarioKind = "chat" | "web" | "file";

export type ThemeMode = "dark" | "light";

export interface Scenario {
  id: ScenarioKind;
  title: string;
  subtitle: string;
  icon: string;
  payloadText: string;
  bytesPreview: string;
  targetService: string;
  sourceApp: string;
}

export interface LayerInfo {
  number: number;
  nameEn: string;
  nameAr: string;
  pduNameAr: string;
  pduNameEn: string;
  color: string;
  bgLight: string;
  borderColor: string;
  simpleExplanation: string;
  realWorldAnalogy: string;
  associatedDevice?: string;
  commonProtocols: string[];
  keyFunction: string;
}

export interface TcpLayerInfo {
  number: number;
  nameEn: string;
  nameAr: string;
  pduNameAr: string;
  pduNameEn: string;
  color: string;
  bgLight: string;
  borderColor: string;
  simpleExplanation: string;
  realWorldAnalogy: string;
  associatedDevice?: string;
  commonProtocols: string[];
  osiLayersMapped: string;
  keyFunction: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
