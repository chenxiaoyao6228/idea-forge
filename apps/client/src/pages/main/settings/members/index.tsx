import { useState } from "react";
import { useTranslation } from "react-i18next";
import GroupManagementPanel from "./group-management";
import VisitorPanel from "./visistor-management";
import MemberManagementPanel from "./member-management";

export const Members = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: t("Member Management"), component: <MemberManagementPanel /> },
    { label: t("Group Management"), component: <GroupManagementPanel /> },
    { label: t("Collaborative Visitors"), component: <VisitorPanel /> },
  ];
  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        {tabs.map((tabItem, idx) => (
          <button
            key={tabItem.label}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: tab === idx ? "2px solid #1890ff" : "none",
              background: "none",
              cursor: "pointer",
              fontWeight: tab === idx ? "500" : "normal",
            }}
            onClick={() => setTab(idx)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>{tabs[tab].component}</div>
    </div>
  );
};
