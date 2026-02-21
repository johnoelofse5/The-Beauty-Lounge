import { Client } from "./client";
import { ExternalClientInfo } from "./external-client-info";

export interface ClientSelectionStepProps {
  clients: Client[];
  selectedClient: Client | null;
  isExternalClient: boolean;
  externalClientInfo: ExternalClientInfo;
  externalClientFormErrors: Record<string, string>;
  visibleElements: Set<string>;
  onSelectClient: (client: Client) => void;
  onSelectExternal: () => void;
  onExternalInfoChange: (info: ExternalClientInfo) => void;
  onClearError: (field: string) => void;
  onContinue: () => void;
  onBack: () => void;
}