/* =========================================
   Cloudflare Worker URL
========================================= */

const API_URL =
      https://coupon-api.yoshioka-mwork.workers.dev;


/* =========================================
   DOM
========================================= */

const startDate =
    document.getElementById("startDate");

const endDate =
    document.getElementById("endDate");

const saveCampaignButton =
    document.getElementById("saveCampaignButton");

const reloadButton =
    document.getElementById("reloadButton");

const couponList =
    document.getElementById("couponList");

const historyBody =
    document.getElementById("historyBody");

const addCouponButton =
    document.getElementById("addCouponButton");

const couponModal =
    document.getElementById("couponModal");

const modalTitle =
    document.getElementById("modalTitle");

const modalCloseButton =
    document.getElementById("modalCloseButton");

const modalCancelButton =
    document.getElementById("modalCancelButton");

const couponForm =
    document.getElementById("couponForm");

const couponId =
    document.getElementById("couponId");

const couponRank =
    document.getElementById("couponRank");

const couponName =
    document.getElementById("couponName");

const couponProbability =
    document.getElementById("couponProbability");

const couponStock =
    document.getElementById("couponStock");

const message =
    document.getElementById("message");


/* =========================================
   メッセージ
========================================= */

function showMessage(text, error = false) {

    message.textContent = text;

    message.hidden = false;

    message.classList.toggle(
        "error",
        error
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    setTimeout(() => {

        message.hidden = true;

    }, 4000);

}


/* =========================================
   API
========================================= */

async function apiFetch(
    path,
    options = {}
) {

    const response =
        await fetch(
            API_URL + path,
            {
                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok || data.success === false) {

        throw new Error(
            data.error ||
            "APIエラーが発生しました"
        );

    }


    return data;

}


/* =========================================
   キャンペーン取得
========================================= */

async function loadCampaign() {

    const data =
        await apiFetch(
            "/admin/campaign"
        );


    startDate.value =
        data.campaign.start_date;

    endDate.value =
        data.campaign.end_date;

}


/* =========================================
   キャンペーン保存
========================================= */

async function saveCampaign() {

    const start =
        startDate.value;

    const end =
        endDate.value;


    if (!start || !end) {

        showMessage(
            "開始日と終了日を入力してください",
            true
        );

        return;

    }


    if (start > end) {

        showMessage(
            "終了日は開始日以降にしてください",
            true
        );

        return;

    }


    saveCampaignButton.disabled = true;

    saveCampaignButton.textContent =
        "保存中...";


    try {

        await apiFetch(
            "/admin/campaign",
            {
                method: "PUT",

                body: JSON.stringify({
                    start_date: start,
                    end_date: end
                })
            }
        );


        showMessage(
            "キャンペーン期間を保存しました"
        );


    } catch (error) {

        showMessage(
            error.message,
            true
        );

    }


    saveCampaignButton.disabled = false;

    saveCampaignButton.textContent =
        "開催期間を保存";

}


/* =========================================
   賞品取得
========================================= */

async function loadCoupons() {

    couponList.innerHTML = `
        <div class="loading">
            読み込み中...
        </div>
    `;


    const data =
        await apiFetch(
            "/admin/coupons"
        );


    const coupons =
        data.coupons || [];


    if (coupons.length === 0) {

        couponList.innerHTML = `
            <div class="loading">
                賞品が登録されていません。
            </div>
        `;

        return;

    }


    couponList.innerHTML =
        coupons
            .map(createCouponHTML)
            .join("");

}


/* =========================================
   賞品HTML
========================================= */

function createCouponHTML(coupon) {

    return `

        <div class="coupon-item">

            <span class="coupon-rank">
                ${escapeHTML(coupon.rank)}
            </span>


            <div class="coupon-name">
                ${escapeHTML(coupon.name)}
            </div>


            <div class="coupon-stats">

                <div class="stat">

                    <span class="stat-label">
                        当選確率
                    </span>

                    <span class="stat-value">
                        ${Number(coupon.probability)}%
                    </span>

                </div>


                <div class="stat">

                    <span class="stat-label">
                        残り枚数
                    </span>

                    <span class="stat-value">
                        ${Number(coupon.stock)}枚
                    </span>

                </div>

            </div>


            <div class="coupon-actions">

                <button
                    type="button"
                    class="edit-button"
                    data-edit-id="${coupon.id}"
                >
                    編集
                </button>


                <button
                    type="button"
                    class="delete-button"
                    data-delete-id="${coupon.id}"
                >
                    削除
                </button>

            </div>

        </div>

    `;

}


/* =========================================
   賞品編集モーダル
========================================= */

function openEditModal(coupon) {

    modalTitle.textContent =
        "賞品編集";

    couponId.value =
        coupon.id;

    couponRank.value =
        coupon.rank;

    couponName.value =
        coupon.name;

    couponProbability.value =
        coupon.probability;

    couponStock.value =
        coupon.stock;

    couponModal.hidden = false;

    document.body.style.overflow =
        "hidden";

}


/* =========================================
   賞品追加モーダル
========================================= */

function openAddModal() {

    modalTitle.textContent =
        "賞品追加";

    couponId.value = "";

    couponRank.value = "";

    couponName.value = "";

    couponProbability.value = 0;

    couponStock.value = 0;

    couponModal.hidden = false;

    document.body.style.overflow =
        "hidden";

}


/* =========================================
   モーダル閉じる
========================================= */

function closeModal() {

    couponModal.hidden = true;

    document.body.style.overflow =
        "";

}


/* =========================================
   賞品保存
========================================= */

async function saveCoupon(event) {

    event.preventDefault();


    const id =
        couponId.value;

    const rank =
        couponRank.value.trim();

    const name =
        couponName.value.trim();

    const probability =
        Number(couponProbability.value);

    const stock =
        Number(couponStock.value);


    if (!rank || !name) {

        showMessage(
            "等級と賞品名を入力してください",
            true
        );

        return;

    }


    if (
        !Number.isFinite(probability) ||
        probability < 0
    ) {

        showMessage(
            "当選確率を正しく入力してください",
            true
        );

        return;

    }


    if (
        !Number.isFinite(stock) ||
        stock < 0
    ) {

        showMessage(
            "残り枚数を正しく入力してください",
            true
        );

        return;

    }


    /*
     * 確率合計チェック
     */

    const couponData =
        await apiFetch(
            "/admin/coupons"
        );


    const coupons =
        couponData.coupons || [];


    let probabilityTotal = 0;


    for (const coupon of coupons) {

        if (
            id &&
            String(coupon.id) === String(id)
        ) {

            continue;

        }

        probabilityTotal +=
            Number(coupon.probability);

    }


    probabilityTotal +=
        probability;


    if (probabilityTotal !== 100) {

        showMessage(
            `当選確率の合計が ${probabilityTotal}% になります。100%にしてください。`,
            true
        );

        return;

    }


    try {

        if (id) {

            await apiFetch(
                `/admin/coupons/${id}`,
                {
                    method: "PUT",

                    body: JSON.stringify({
                        rank,
                        name,
                        probability,
                        stock
                    })
                }
            );


            showMessage(
                "賞品を更新しました"
            );

        } else {

            await apiFetch(
                "/admin/coupons",
                {
                    method: "POST",

                    body: JSON.stringify({
                        rank,
                        name,
                        probability,
                        stock
                    })
                }
            );


            showMessage(
                "賞品を追加しました"
            );

        }


        closeModal();

        await loadCoupons();


    } catch (error) {

        showMessage(
            error.message,
            true
        );

    }

}


/* =========================================
   賞品削除
========================================= */

async function deleteCoupon(id) {

    const result =
        confirm(
            "この賞品を削除しますか？\n\n発券履歴がある賞品は削除できません。"
        );


    if (!result) {

        return;

    }


    try {

        await apiFetch(
            `/admin/coupons/${id}`,
            {
                method: "DELETE"
            }
        );


        showMessage(
            "賞品を削除しました"
        );


        await loadCoupons();


    } catch (error) {

        showMessage(
            error.message,
            true
        );

    }

}


/* =========================================
   発券履歴
========================================= */

async function loadHistory() {

    historyBody.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="loading"
            >
                読み込み中...
            </td>
        </tr>
    `;


    const data =
        await apiFetch(
            "/admin/history"
        );


    const history =
        data.history || [];


    if (history.length === 0) {

        historyBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="loading"
                >
                    発券履歴がありません。
                </td>
            </tr>
        `;

        return;

    }


    historyBody.innerHTML =
        history
            .map(createHistoryHTML)
            .join("");

}


/* =========================================
   履歴HTML
========================================= */

function createHistoryHTML(item) {

    const used =
        Number(item.used) === 1;


    return `

        <tr>

            <td>
                ${Number(item.id)}
            </td>


            <td>
                ${escapeHTML(item.rank)}
            </td>


            <td>
                ${escapeHTML(item.name)}
            </td>


            <td>
                ${formatDate(item.issued_at)}
            </td>


            <td>

                ${
                    used

                    ? `
                        <span class="status used">
                            使用済み
                        </span>
                    `

                    : `
                        <span class="status unused">
                            未使用
                        </span>
                    `
                }

            </td>


            <td>
                ${
                    item.used_at
                    ? formatDate(item.used_at)
                    : "-"
                }
            </td>

        </tr>

    `;

}


/* =========================================
   日付表示
========================================= */

function formatDate(value) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(
            value.replace(" ", "T")
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString(
        "ja-JP",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================
   XSS対策
========================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================
   全データ読み込み
========================================= */

async function loadAll() {

    try {

        await Promise.all([
            loadCampaign(),
            loadCoupons(),
            loadHistory()
        ]);


    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            true
        );

    }

}


/* =========================================
   イベント
========================================= */

saveCampaignButton.addEventListener(
    "click",
    saveCampaign
);


reloadButton.addEventListener(
    "click",
    loadAll
);


addCouponButton.addEventListener(
    "click",
    openAddModal
);


modalCloseButton.addEventListener(
    "click",
    closeModal
);


modalCancelButton.addEventListener(
    "click",
    closeModal
);


couponForm.addEventListener(
    "submit",
    saveCoupon
);


/* =========================================
   賞品一覧のボタン
========================================= */

couponList.addEventListener(
    "click",
    async (event) => {

        const editButton =
            event.target.closest(
                "[data-edit-id]"
            );


        const deleteButton =
            event.target.closest(
                "[data-delete-id]"
            );


        if (editButton) {

            const id =
                editButton.dataset.editId;


            try {

                const data =
                    await apiFetch(
                        "/admin/coupons"
                    );


                const coupon =
                    data.coupons.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );


                if (!coupon) {

                    throw new Error(
                        "賞品が見つかりません"
                    );

                }


                openEditModal(coupon);


            } catch (error) {

                showMessage(
                    error.message,
                    true
                );

            }

        }


        if (deleteButton) {

            await deleteCoupon(
                deleteButton.dataset.deleteId
            );

        }

    }
);


/* =========================================
   初期読み込み
========================================= */

loadAll();
