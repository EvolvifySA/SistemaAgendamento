import React, { useEffect, useMemo, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import { CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import { Professional } from "../types";

interface CalInlineEmbedProps {
  professional?: Professional;
}

function normalizeCalLink(value?: string): string {
  if (!value) return "";
  return value
    .trim()
    .replace(/^https?:\/\/(app\.)?cal\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
}

function getNamespace(professional?: Professional, reloadToken = 0) {
  const stableId = professional?.calEventTypeId || professional?.id || "empty";
  return `dentist-${stableId}-${reloadToken}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export const CalInlineEmbed: React.FC<CalInlineEmbedProps> = ({ professional }) => {
  const [reloadToken, setReloadToken] = useState(0);
  const [status, setStatus] = useState<"empty" | "loading" | "ready" | "slow">("loading");
  const calLink = normalizeCalLink(professional?.calUsername);
  const namespace = useMemo(() => getNamespace(professional, reloadToken), [professional, reloadToken]);

  useEffect(() => {
    if (!professional || !calLink) {
      setStatus("empty");
      return;
    }

    setStatus("loading");
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      setStatus((current) => current === "loading" ? "slow" : current);
    }, 9000);
    const readyTimer = window.setTimeout(() => {
      setStatus((current) => current === "loading" ? "ready" : current);
    }, 1800);

    (async () => {
      const cal = await getCalApi({ namespace });
      if (cancelled) return;
      cal("ui", {
        hideEventTypeDetails: false,
        layout: "month_view"
      });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(readyTimer);
    };
  }, [professional, calLink, namespace]);

  if (!professional || !calLink) {
    return (
      <div className="min-h-[420px] bg-white border border-[#E5E5E0] rounded-3xl flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <CalendarDays className="w-10 h-10 mx-auto text-[#C17A63] mb-3" />
          <p className="font-bold text-[#1A1A1A]">Cal.com ainda nao conectado para esta dentista.</p>
          <p className="text-xs text-[#707060] mt-2">
            Preencha o link publico do evento em Profissionais, por exemplo dramarciaodonto/30min.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F5F5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-serif text-xl text-[#5A5A40] italic font-semibold">Marcacao oficial no Cal.com</h3>
          <p className="text-[11px] text-[#707060] mt-0.5">{professional.name} - cal.com/{calLink}</p>
        </div>
        <div className="flex items-center gap-2">
          {professional.calEventTypeId && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F2F2E9] text-[#5A5A40] border border-[#D8D8C0] px-3 py-1 rounded-full">
              Event Type #{professional.calEventTypeId}
            </span>
          )}
          <a
            href={`https://cal.com/${calLink}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white text-[#5A5A40] border border-[#D8D8C0] px-3 py-1 rounded-full hover:bg-[#F5F5F0] transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir
          </a>
        </div>
      </div>

      <div className="relative min-h-[680px] bg-white">
        {status === "slow" && (
          <div className="absolute inset-0 z-10 bg-white flex items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <CalendarDays className="w-9 h-9 mx-auto text-[#C17A63] mb-3" />
              <p className="font-bold text-[#1A1A1A]">Cal.com demorou para responder</p>
              <p className="text-xs text-[#707060] mt-2">
                A conexao com o calendario externo ficou lenta. Tente recarregar este bloco ou abrir em nova aba.
              </p>
              <button
                type="button"
                onClick={() => setReloadToken((current) => current + 1)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-xs font-bold hover:bg-[#474732] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar Cal.com
              </button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 z-10 bg-white flex items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <CalendarDays className="w-9 h-9 mx-auto text-[#C17A63] mb-3" />
              <p className="font-bold text-[#1A1A1A]">Carregando Cal.com...</p>
              <p className="text-xs text-[#707060] mt-2">Abrindo a agenda oficial desta dentista.</p>
            </div>
          </div>
        )}

        <Cal
          key={namespace}
          namespace={namespace}
          calLink={calLink}
          style={{ width: "100%", height: "680px", overflow: "scroll" }}
          config={{
            layout: "month_view",
            useSlotsViewOnSmallScreen: "true"
          }}
        />
      </div>
    </div>
  );
};
