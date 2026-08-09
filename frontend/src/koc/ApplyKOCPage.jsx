import React, { useMemo, useState, useEffect } from "react";
import { Check } from "lucide-react";
import api from '../api/index';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplyKOCPage({ onSubmit }) {
    const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [fbUsername, setFbUsername] = useState("");
    const [fbUrl, setFbUrl] = useState("");
    const [igUsername, setIgUsername] = useState("");
    const [threadsUsername, setThreadsUsername] = useState("");
    const [igUrl, setIgUrl] = useState("");
    const [threadsUrl, setThreadsUrl] = useState("");

    const [touched, setTouched] = useState({
        displayName: false,
        email: false,
        fbUrl: false,
        igUsername: false,
        threadsUsername: false,
    });

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [submitState, setSubmitState] = useState("idle");
    const [toast, setToast] = useState({ show: false, msg: "" });
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const showToast = (msg) => {
        setToast({ show: true, msg });
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => setToast({ show: false, msg: "" }), 2800);
    };

    const displayNameValid = displayName.trim().length >= 2;
    const emailValid = emailRe.test(email.trim());
    const hasAnySocial = !!(fbUsername.trim() || igUsername.trim() || threadsUsername.trim());

    const [applicationStatus, setApplicationStatus] = useState(null); // null | 'pending' | 'approved' | 'rejected'
    const [statusLoading, setStatusLoading] = useState(true);
    const [rejectReason, setRejectReason] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                setStatusLoading(false);
                return;
            }
            try {
                const res = await api.get(`/koc/profile/getProfile?user_id=${userId}`);
                if (res.data.success) {
                    setApplicationStatus(res.data.approval_status);
                    setRejectReason(res.data.reject_reason);
                }
            } catch (err) {
                console.error("查詢申請狀態失敗", err);
            } finally {
                setStatusLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const isPending = applicationStatus === 'pending';
    const isRejected = applicationStatus === 'rejected';

    // 🟢 簡約風格輸入框樣式
    const baseInputClass = "w-full rounded-2xl bg-gray-50 border border-transparent px-5 py-3.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-800 shadow-sm placeholder:text-gray-400";
    const errorInputClass = "border-red-300 bg-red-50 focus:ring-red-500";

    const inputClass = (isValid, isError) =>
        isError ? `${baseInputClass} ${errorInputClass}` : baseInputClass;

    const socialErrors = useMemo(() => !hasAnySocial, [hasAnySocial]);



    const handleSubmit = async () => {
        setTouched({
            displayName: true,
            email: true,
            fbUrl: true,
            igUsername: true,
            threadsUsername: true,
        });

        let ok = true;
        let errorMsg = "";

        if (!displayNameValid || !emailValid) {
            errorMsg = "請填寫正確的顯示名稱(至少2字)與電子郵件";
            ok = false;
        }

        if (ok && !hasAnySocial) {
            errorMsg = "請至少填入一個社群帳號";
            ok = false;
        }

        if (ok && !hasAnySocial) {
            errorMsg = "請至少填入一個社群帳號";
            ok = false;
        }

        if (ok && fbUsername.trim() && !fbUrl.trim()) {
            errorMsg = "填寫 FB 帳號後，請務必附上 FB 連結";
            ok = false;
        }

        if (ok && igUsername.trim() && !igUrl.trim()) {
            errorMsg = "填寫 IG 帳號後，請務必附上 IG 連結";
            ok = false;
        }

        if (ok && threadsUsername.trim() && !threadsUrl.trim()) {
            errorMsg = "填寫 Threads 帳號後，請務必附上 Threads 連結";
            ok = false;
        }

        if (ok && !termsAccepted) {
            errorMsg = "請勾選同意 KOC 條款";
            ok = false;
        }

        if (ok && !termsAccepted) {
            errorMsg = "請勾選同意 KOC 條款";
            ok = false;
        }

        if (!ok) {
            showToast(errorMsg);
            return;
        }

        setSubmitState("submitting");
        try {
            const res = await api.post('/koc/apply', {
                user_id: user_id,
                name: displayName.trim(),
                email: email.trim(),
                fb_account: fbUsername.trim() || '',
                fb_url: fbUrl.trim() || '',
                ig_account: igUsername.trim() || '',
                ig_url: igUrl.trim() || '',
                threads_account: threadsUsername.trim() || '',
                threads_url: threadsUrl.trim() || '',
            });

            if (res.data.success) {
                setSubmitState("success");
                setShowSuccessModal(true);
            } else {
                setSubmitState("idle");
                showToast("✗ " + (res.data.err || '申請失敗，請稍後再試'));
            }
        } catch (err) {
            console.error('申請失敗', err);
            setSubmitState("idle");
            showToast("送出失敗，請稍後再試");
        }
    };


    return (
        <div className="animate-in fade-in duration-500 max-w-3xl">
            <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">我想成為KOC</h2>

            {isPending && (
                <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 px-6 py-4 text-sm text-amber-700 font-bold">
                    您的申請正在審核中，請耐心等候，審核期間無法重新提交。
                </div>
            )}

            {isRejected && (
                <div className="mb-8 rounded-2xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
                    <p className="font-bold mb-1">您的申請未通過審核</p>
                    {rejectReason && <p className="text-red-600">原因：{rejectReason}</p>}
                    <p className="mt-2 text-xs text-red-500">您可以修改資料後重新提交申請。</p>
                </div>
            )}

            <div className={isPending ? "opacity-50 pointer-events-none select-none" : ""}>

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
                    <p className="mb-6 text-xs text-gray-400">提交後將由管理員審核您的社群帳號</p>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* FB */}
                        <div>
                            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">FB</label>
                            <input
                                className={inputClass(touched.fbUsername && fbUsername.trim().length > 0, touched.fbUsername && socialErrors && !hasAnySocial)}
                                placeholder="帳號名稱"
                                value={fbUsername}
                                onChange={(e) => setFbUsername(e.target.value)}
                                onBlur={() => setTouched((p) => ({ ...p, fbUsername: true }))}
                            />
                            <input
                                type="url"
                                className={`${baseInputClass} mt-2`}
                                placeholder="個人首頁網址"
                                value={fbUrl}
                                onChange={(e) => setFbUrl(e.target.value)}
                            />
                        </div>
                        {/* IG */}
                        <div>
                            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">IG</label>
                            <input
                                className={inputClass(touched.igUsername && igUsername.trim().length > 0, touched.igUsername && socialErrors && !hasAnySocial)}
                                placeholder="@username"
                                value={igUsername}
                                onChange={(e) => setIgUsername(e.target.value)}
                                onBlur={() => setTouched((p) => ({ ...p, igUsername: true }))}
                            />
                            <input
                                className={`${baseInputClass} mt-2`}
                                placeholder="IG 個人頁面連結"
                                value={igUrl}
                                onChange={(e) => setIgUrl(e.target.value)}
                            />
                        </div>

                        {/* Threads */}
                        <div>
                            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">THREADS</label>
                            <input
                                className={inputClass(touched.threadsUsername && threadsUsername.trim().length > 0, touched.threadsUsername && socialErrors && !hasAnySocial)}
                                placeholder="@username"
                                value={threadsUsername}
                                onChange={(e) => setThreadsUsername(e.target.value)}
                                onBlur={() => setTouched((p) => ({ ...p, threadsUsername: true }))}
                            />
                            <input
                                className={`${baseInputClass} mt-2`}
                                placeholder="Threads 個人頁面連結"
                                value={threadsUrl}
                                onChange={(e) => setThreadsUrl(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 🟢 同意條款與送出按鈕 */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-10 gap-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setTermsAccepted(!termsAccepted)}
                            className="flex items-center gap-3 group"
                        >
                            <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${termsAccepted ? 'border-slate-800 bg-slate-800' : 'border-gray-300 bg-white group-hover:border-slate-400'}`}>
                                {termsAccepted && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-sm font-medium text-gray-500">
                                申請成為 KOC 代表您已同意
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-sm font-bold text-slate-800 underline underline-offset-4 hover:text-black"
                        >
                            KOC 條款
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitState === "submitting"}
                        className={`rounded-full px-10 py-4 text-sm font-bold text-white transition-all shadow-lg ${submitState === "success" ? "bg-green-500 hover:bg-green-600" : "bg-black hover:bg-gray-800 active:scale-95"
                            } ${submitState === "submitting" ? "opacity-50 cursor-wait" : ""}`}
                    >
                        {submitState === "submitting" ? "資料傳送中..." : submitState === "success" ? "✓ 申請已送出" : "確認送出申請"}
                    </button>
                </div>

                {/* 🟢 彈出提示 (Toast) */}
                <div
                    className={`fixed bottom-10 left-1/2 z-[999] -translate-x-1/2 rounded-full bg-slate-800 px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 shadow-xl ${toast.show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
                        }`}
                >
                    {toast.msg}
                </div>
            </div>

            {/* 🟢 KOC 條款彈窗 */}
            {showTermsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">KOC 合作條款</h3>
                        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                            <p><strong className="text-slate-800">一、資格與審核</strong><br />
                            申請人須提供真實且公開之社群帳號資訊，平台將依申請內容進行人工審核，審核結果將於系統中通知。</p>

                            <p><strong className="text-slate-800">二、內容規範</strong><br />
                            KOC 於合作活動中發布之文案、圖片及連結，須符合平台與相關法規之規定，不得含有虛假、誇大或違法內容。</p>

                            <p><strong className="text-slate-800">三、優惠碼與分潤</strong><br />
                            KOC 使用平台核發之專屬優惠碼所產生之訂單，將依約定比例計算分潤，分潤明細將於「收益總覽」頁面顯示。</p>

                            <p><strong className="text-slate-800">四、帳號管理</strong><br />
                            平台保留因違反本條款、提供不實資訊或社群帳號無法公開查證等情況，暫停或終止 KOC 資格之權利。</p>

                            <p><strong className="text-slate-800">五、條款修訂</strong><br />
                            平台得依營運需要修訂本條款內容，修訂後將於系統中公告。</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTermsModal(false)}
                            className="mt-8 w-full rounded-full bg-black py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
                        >
                            我已閱讀
                        </button>
                    </div>
                </div>
            )}

            {/* 🟢 申請成功彈窗 */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
                    <div className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl text-center">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <Check size={32} className="text-green-600" strokeWidth={3} />
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-slate-900">申請已送出</h3>
                        <p className="mb-8 text-sm leading-relaxed text-gray-500">
                            您的 KOC 申請已成功送出，請等待平台審核。<br />
                            審核通過後，請重新登入即可進入 KOC 專屬功能。
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setShowSuccessModal(false);
                                onSubmit?.();
                            }}
                            className="w-full rounded-full bg-black py-4 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95"
                        >
                            我知道了
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}