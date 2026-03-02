"use client";

import OwnerPanel from "@/components/admin/OwnerPanel";
import ToastContainer from "@/components/ui/ToastContainer";

export default function AdminPage() {
    return (
        <>
            <ToastContainer />
            <OwnerPanel />
        </>
    );
}
