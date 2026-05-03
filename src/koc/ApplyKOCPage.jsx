import React, { useMemo, useState } from "react";
import { Check } from "lucide-react";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplyKOCPage({ onSubmit }) {
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [fbUrl, setFbUrl] = useState("");
    const [igUsername, setIgUsername] = useState("");
    const [threadsUsername, setThreadsUsername] = useState("");

    const [touched, setTouched] = useState({
        displayName: false,
        email: false,
        fbUrl: false,
        igUsername: false,
        threadsUsername: false,
    });

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [igVerify, setIgVerify] = useState({ status: "idle" }); 
    const [threadsVerify, setThreadsVerify] = useState({ status: "idle" });
    const [submitState, setSubmitState] = useState("idle"); 
    const [toast, setToast] = useState({ show: false, msg: "" });

    const showToast = (msg) => {
        setToast({ show: true, msg });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast({ show: false, msg: "" }), 2800);
    };

    const displayNameValid = displayName.trim().length >= 2;
    const emailValid = emailRe.test(email.trim());
    const hasAnySocial = !!(fbUrl.trim() || igUsername.trim() || threadsUsername.trim());

    // 🟢 簡約風格輸入框樣式
    const baseInputClass = "w-full rounded-2xl bg-gray-50 border border-transparent px-5 py-3.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-800 shadow-sm placeholder:text-gray-400";
    const errorInputClass = "border-red-300 bg-red-50 focus:ring-red-500";
    
    const inputClass = (isValid, isError) => 
        isError ? `${baseInputClass} ${errorInputClass}` : baseInputClass;

    const socialErrors = useMemo(() => !hasAnySocial, [hasAnySocial]);

    const verifySocial = async (platform) => {
        if (platform === "ig") {
            if (!igUsername.trim()) {
                setTouched((p) => ({ ...p, igUsername: true }));
                showToast("請先填入帳號");
                return;
            }
            setIgVerify({ status: "verifying" });
            await new Promise((r) => setTimeout(r, 1200));
            setIgVerify({ status: "verified" });
            showToast("✓ IG 帳號驗證成功");
            return;
        }

        if (!threadsUsername.trim()) {
            setTouched((p) => ({ ...p, threadsUsername: true }));
            showToast("請先填入帳號");
            return;
        }
        setThreadsVerify({ status: "verifying" });
        await new Promise((r) => setTimeout(r, 1200));
        setThreadsVerify({ status: "verified" });
        showToast("✓ THREADS 帳號驗證成功");
    };

    const handleSubmit = async () => {
        // 先把所有欄位標記為已觸碰，觸發 UI 上的紅色錯誤框
        setTouched({
            displayName: true,
            email: true,
            fbUrl: true,
            igUsername: true,
            threadsUsername: true,
        });

        let ok = true;
        let errorMsg = ""; // 🟢 用來收集第一個遇到的錯誤訊息

        // 1. 檢查基本資料
        if (!displayNameValid || !emailValid) {
            errorMsg = "請填寫正確的顯示名稱(至少2字)與電子郵件";
            ok = false;
        }

        // 2. 檢查社群帳號（如果基本資料沒錯，才檢查這個，避免一次跳太多錯誤）
        if (ok && !hasAnySocial) {
            errorMsg = "請至少填入一個社群帳號";
            ok = false;
        }

        // 3. 檢查是否同意條款
        if (ok && !termsAccepted) {
            errorMsg = "請勾選同意 KOC 條款";
            ok = false;
        }

        // 🟢 攔截錯誤：如果不通過，彈出提示並停止執行
        if (!ok) {
            showToast(errorMsg); 
            return;
        }

        // --- 若全部通過，開始執行送出邏輯 ---
        setSubmitState("submitting");
        try {
            // 模擬 API 延遲
            await new Promise((r) => setTimeout(r, 900));
            await onSubmit?.({
                displayName: displayName.trim(),
                email: email.trim(),
                socials: {
                    fbUrl: fbUrl.trim() || null,
                    igUsername: igUsername.trim() || null,
                    threadsUsername: threadsUsername.trim() || null,
                },
                verified: {
                    ig: igVerify.status === "verified",
                    threads: threadsVerify.status === "verified",
                },
                termsAccepted: true,
            });

            // 成功狀態
            setSubmitState("success");
            showToast("✓ KOC 申請已送出，歡迎加入！");
        } catch (e) {
            // 失敗狀態
            setSubmitState("idle");
            showToast("送出失敗，請稍後再試");
        }
    };

    const VerifyButton = ({ platform }) => {
        const isIG = platform === "ig";
        const state = isIG ? igVerify.status : threadsVerify.status;
        const text = state === "verifying" ? "驗證中..." : state === "verified" ? "✓ 已驗證" : "驗證";
        const disabled = state !== "idle";

        return (
            <button 
                type="button" 
                disabled={disabled} 
                onClick={() => verifySocial(platform)}
                className={`absolute right-2 top-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    state === "verified" 
                        ? "bg-green-50 text-green-600 cursor-default" 
                        : "bg-slate-800 text-white hover:bg-black"
                }`}
            >
                {text}
            </button>
        );
    };

    return (
        <div className="animate-in fade-in duration-500 max-w-3xl">
            <h2 className="mb-10 text-3xl font-bold text-slate-800">我想成為KOC</h2>

            {/* 🟢 基本資訊卡片 */}
            <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <h3 className="mb-6 text-lg font-bold text-slate-700">申請資料</h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">顯示名稱</label>
                        <input
                            className={inputClass(displayNameValid && touched.displayName, touched.displayName && !displayNameValid)}
                            placeholder="請輸入顯示名稱"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            onBlur={() => setTouched((p) => ({ ...p, displayName: true }))}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">電子郵件</label>
                        <input
                            type="email"
                            className={inputClass(emailValid && touched.email, touched.email && !emailValid && email.trim().length > 0)}
                            placeholder="請輸入聯絡信箱"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        />
                    </div>
                </div>
            </div>

            {/* 🟢 社群帳號卡片 */}
            <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between">
                    <h3 className="text-lg font-bold text-slate-700">社群帳號</h3>
                    <span className="text-xs font-bold text-red-400 mt-2 md:mt-0">*請至少填入一項（須為公開帳號）</span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* FB */}
                    <div>
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">FB</label>
                        <input
                            type="url"
                            className={inputClass(touched.fbUrl && fbUrl.trim().length > 0, touched.fbUrl && socialErrors && !hasAnySocial)}
                            placeholder="個人首頁網址"
                            value={fbUrl}
                            onChange={(e) => setFbUrl(e.target.value)}
                            onBlur={() => setTouched((p) => ({ ...p, fbUrl: true }))}
                        />
                    </div>

                    {/* IG */}
                    <div>
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">IG</label>
                        <div className="relative">
                            <input
                                className={`${inputClass((touched.igUsername && igUsername.trim().length > 0) || igVerify.status === "verified", touched.igUsername && socialErrors && !hasAnySocial)} pr-[85px]`}
                                placeholder="@username"
                                value={igUsername}
                                onChange={(e) => {
                                    setIgUsername(e.target.value);
                                    if (igVerify.status === "verified") setIgVerify({ status: "idle" });
                                }}
                                onBlur={() => setTouched((p) => ({ ...p, igUsername: true }))}
                            />
                            <VerifyButton platform="ig" />
                        </div>
                    </div>

                    {/* Threads */}
                    <div>
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">THREADS</label>
                        <div className="relative">
                            <input
                                className={`${inputClass((touched.threadsUsername && threadsUsername.trim().length > 0) || threadsVerify.status === "verified", touched.threadsUsername && socialErrors && !hasAnySocial)} pr-[85px]`}
                                placeholder="@username"
                                value={threadsUsername}
                                onChange={(e) => {
                                    setThreadsUsername(e.target.value);
                                    if (threadsVerify.status === "verified") setThreadsVerify({ status: "idle" });
                                }}
                                onBlur={() => setTouched((p) => ({ ...p, threadsUsername: true }))}
                            />
                            <VerifyButton platform="threads" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 🟢 同意條款與送出按鈕 */}
            <div className="flex flex-col md:flex-row items-center justify-between mt-10 gap-6">
                <button
                    type="button"
                    onClick={() => setTermsAccepted(!termsAccepted)}
                    className="flex items-center gap-3 group"
                >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${termsAccepted ? 'border-slate-800 bg-slate-800' : 'border-gray-300 bg-white group-hover:border-slate-400'}`}>
                        {termsAccepted && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                        申請成為 KOC 代表您已同意 <span className="font-bold text-slate-800 underline underline-offset-4 hover:text-black">KOC 條款</span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitState === "submitting"}
                    className={`rounded-full px-10 py-4 text-sm font-bold text-white transition-all shadow-lg ${
                        submitState === "success" ? "bg-green-500 hover:bg-green-600" : "bg-black hover:bg-gray-800 active:scale-95"
                    } ${submitState === "submitting" ? "opacity-50 cursor-wait" : ""}`}
                >
                    {submitState === "submitting" ? "資料傳送中..." : submitState === "success" ? "✓ 申請已送出" : "確認送出申請"}
                </button>
            </div>

            {/* 🟢 彈出提示 (Toast) */}
            <div
                className={`fixed bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-slate-800 px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 shadow-xl ${
                    toast.show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
                }`}
            >
                {toast.msg}
            </div>
        </div>
    );
}