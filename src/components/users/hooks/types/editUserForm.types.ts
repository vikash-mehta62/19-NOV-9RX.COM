
export interface UseEditUserFormProps {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialType: "pharmacy" | "hospital" | "group";
  initialStatus: "active" | "inactive" | "pending";
  onSuccess: () => void;
  onClose: () => void;
}

export interface EditUserFormState {
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
}

export type ValidationErrors = Record<string, string>;

