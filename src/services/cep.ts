import { PatientAddress } from "../types";

export interface CepLookupResult {
  address: Omit<PatientAddress, "number" | "complement">;
  error?: undefined;
}

export interface CepLookupError {
  address?: undefined;
  error: string;
}

// Looks up a Brazilian CEP using the public ViaCEP API and returns the
// matching address fields (street, neighborhood, city, state).
// Swap the fetch URL here if the clinic later moves to a paid/internal CEP provider.
export async function lookupCep(rawCep: string): Promise<CepLookupResult | CepLookupError> {
  const cep = rawCep.replace(/\D/g, "");

  if (cep.length !== 8) {
    return { error: "CEP deve conter 8 dígitos." };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      return { error: "Não foi possível consultar o CEP no momento." };
    }

    const data = await response.json();
    if (data.erro) {
      return { error: "CEP não encontrado." };
    }

    return {
      address: {
        cep: data.cep || cep,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || ""
      }
    };
  } catch {
    return { error: "Falha na conexão ao consultar o CEP." };
  }
}
