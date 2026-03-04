import React, { useMemo, useState } from "react";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

export default function ApplyKOCPage({
    onSubmit, // optional: async/sync handler
}) {
    // fields
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [fbUrl, setFbUrl] = useState("");
    const [igUsername, setIgUsername] = useState("");
    const [threadsUsername, setThreadsUsername] = useState("");

    // state for UI
    const [touched, setTouched] = useState({
        displayName: false,
        email: false,
        fbUrl: false,
        igUsername: false,
        threadsUsername: false,
    });

    const [termsAccepted, setTermsAccepted] = useState(false);

    // verify buttons
    const [igVerify, setIgVerify] = useState({ status: "idle" }); // idle | verifying | verified
    const [threadsVerify, setThreadsVerify] = useState({ status: "idle" });

    // submit
    const [submitState, setSubmitState] = useState("idle"); // idle | submitting | success

    // toast
    const [toast, setToast] = useState({ show: false, msg: "" });

    const showToast = (msg) => {
        setToast({ show: true, msg });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast({ show: false, msg: "" }), 2800);
    };

    const displayNameValid = displayName.trim().length >= 2;
    const emailValid = emailRe.test(email.trim());
    const hasAnySocial = !!(fbUrl.trim() || igUsername.trim() || threadsUsername.trim());

    const fieldBase =
        "w-full rounded-[10px] bg-[#F5F5F5] border-[1.5px] border-transparent px-4 py-[13px] text-[14px] text-[#1A1A18] outline-none transition-all placeholder:text-[#C0C0C0] placeholder:text-[13px] focus:border-[#1A1A18] focus:bg-white";
    const fieldValid = "border-[#6BBF6B] bg-white";
    const fieldError = "border-[#C8522A] bg-[#FEF5F3]";

    const inputClass = (isValid, isError) =>
        [fieldBase, isValid ? fieldValid : "", isError ? fieldError : ""].filter(Boolean).join(" ");

    const socialErrors = useMemo(() => {
        // only show social errors after submit attempt, or if user touched a field AND it must be red because no socials at all
        // (your original behavior: submit triggers all red if none filled)
        return !hasAnySocial;
    }, [hasAnySocial]);

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
        // mark all as touched on submit
        setTouched({
            displayName: true,
            email: true,
            fbUrl: true,
            igUsername: true,
            threadsUsername: true,
        });

        let ok = true;

        if (!displayNameValid) ok = false;
        if (!emailValid) ok = false;

        if (!hasAnySocial) {
            showToast("請至少填入一個社群帳號");
            ok = false;
        }

        if (!termsAccepted) {
            showToast("請同意 KOC 條款");
            ok = false;
        }

        if (!ok) return;

        setSubmitState("submitting");
        try {
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

            setSubmitState("success");
            showToast("✓ KOC 申請已送出，請等待審核通知");
        } catch (e) {
            setSubmitState("idle");
            showToast("送出失敗，請稍後再試");
        }
    };

    const VerifyButton = ({ platform }) => {
        const isIG = platform === "ig";
        const state = isIG ? igVerify.status : threadsVerify.status;

        const text =
            state === "verifying" ? "驗證中..." : state === "verified" ? "✓ 已驗證" : "驗證";

        const disabled = state !== "idle";
        const cls = [
            "absolute right-2 rounded-[6px] px-3 py-1.5 text-[12px] font-serif whitespace-nowrap transition-colors",
            state === "verified" ? "bg-[#6BBF6B] text-white cursor-default" : "bg-[#1A1A18] text-white hover:bg-[#C8522A]",
            disabled ? "opacity-100" : "",
        ].join(" ");

        return (
            <button type="button" className={cls} disabled={disabled} onClick={() => verifySocial(platform)}>
                {text}
            </button>
        );
    };

    const submitBtnText =
        submitState === "submitting"
            ? "提交中..."
            : submitState === "success"
                ? "✓ 申請已送出"
                : "更新";

    const submitBtnClass =
        submitState === "success"
            ? "bg-[#6BBF6B]"
            : "bg-[#1A1A18] hover:bg-[#C8522A] hover:-translate-y-[1px]";

    return (
        <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-serif">
            <div className="mx-auto max-w-[760px] px-6 pb-20 pt-12">
                <h1 className="mb-10 font-['DM_Serif_Display'] text-[36px]">我想成為KOC</h1>

                {/* Basic info */}
                <div className="mb-8">
                    <p className="mb-5 text-[15px] font-bold tracking-[0.02em]">申請成為KOC</p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                                顯示名稱
                            </label>
                            <input
                                className={inputClass(displayNameValid && touched.displayName, touched.displayName && !displayNameValid)}
                                placeholder="顯示名稱"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                onBlur={() => setTouched((p) => ({ ...p, displayName: true }))}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                                電子郵件
                            </label>
                            <input
                                type="email"
                                className={inputClass(emailValid && touched.email, touched.email && !emailValid && email.trim().length > 0)}
                                placeholder="電子郵件"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Social accounts */}
                <div className="mb-6">
                    <p className="mb-2 text-[15px] font-bold tracking-[0.02em]">社群帳號</p>
                    <p className="mb-5 text-[12px] text-[#8C8880] -mt-1">*請至少填入一項（須為公開帳號）</p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* FB */}
                        <div>
                            <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                                FB
                            </label>
                            <input
                                type="url"
                                className={inputClass(
                                    touched.fbUrl && fbUrl.trim().length > 0,
                                    touched.fbUrl && socialErrors && !hasAnySocial
                                )}
                                placeholder="Your site URL"
                                value={fbUrl}
                                onChange={(e) => setFbUrl(e.target.value)}
                                onBlur={() => setTouched((p) => ({ ...p, fbUrl: true }))}
                            />
                        </div>

                        {/* IG */}
                        <div>
                            <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                                IG
                            </label>
                            <div className="relative">
                                <input
                                    className={[
                                        inputClass(
                                            (touched.igUsername && igUsername.trim().length > 0) || igVerify.status === "verified",
                                            touched.igUsername && socialErrors && !hasAnySocial
                                        ),
                                        "pr-[78px]",
                                    ].join(" ")}
                                    placeholder="@IG username"
                                    value={igUsername}
                                    onChange={(e) => {
                                        setIgUsername(e.target.value);
                                        // reset verified if user edits
                                        if (igVerify.status === "verified") setIgVerify({ status: "idle" });
                                    }}
                                    onBlur={() => setTouched((p) => ({ ...p, igUsername: true }))}
                                />
                                <VerifyButton platform="ig" />
                            </div>
                        </div>

                        {/* Threads */}
                        <div>
                            <label className="mb-2 block text-[11px] tracking-[0.1em] uppercase text-[#8C8880]">
                                THREADS
                            </label>
                            <div className="relative">
                                <input
                                    className={[
                                        inputClass(
                                            (touched.threadsUsername && threadsUsername.trim().length > 0) || threadsVerify.status === "verified",
                                            touched.threadsUsername && socialErrors && !hasAnySocial
                                        ),
                                        "pr-[78px]",
                                    ].join(" ")}
                                    placeholder="@threads username"
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

                {/* Terms */}
                <button
                    type="button"
                    onClick={() => setTermsAccepted((v) => !v)}
                    className="mb-6 flex items-center gap-3 text-left"
                >
                    <span
                        className={[
                            "h-5 w-5 min-w-5 rounded-[5px] border-[1.5px] border-[#E2DDD4] bg-white flex items-center justify-center transition-all",
                            termsAccepted ? "bg-[#1A1A18] border-[#1A1A18]" : "",
                        ].join(" ")}
                    >
                        <span className={termsAccepted ? "text-white" : "hidden"}>
                            <CheckIcon />
                        </span>
                    </span>

                    <span className="text-[13px] text-[#8C8880]">
                        申請成為KOC代表同意{" "}
                        <span
                            className="text-[#1A1A18] font-bold underline"
                            onClick={(e) => {
                                e.stopPropagation();
                                showToast("（示意）打開 KOC 條款");
                            }}
                            role="link"
                        >
                            KOC條款
                        </span>
                    </span>
                </button>

                <div className="mb-7 h-px bg-[#E2DDD4]" />

                {/* Submit */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitState === "submitting"}
                    className={[
                        "rounded-full px-8 py-3.5 text-[15px] tracking-[0.04em] text-white transition-all",
                        submitBtnClass,
                        submitState === "submitting" ? "opacity-70 cursor-wait" : "",
                    ].join(" ")}
                >
                    {submitBtnText}
                </button>

                {/* Toast */}
                <div
                    className={[
                        "fixed bottom-8 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-[#1A1A18] px-6 py-3 text-[13px] text-white transition-all",
                        toast.show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none",
                    ].join(" ")}
                >
                    {toast.msg}
                </div>
            </div>
        </div>
    );
}