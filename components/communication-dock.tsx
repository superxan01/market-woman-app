"use client";
import { useState } from "react";
import { ChatPanel } from "./chat-panel";
import styles from "./communication-dock.module.css";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
export function CommunicationDock(){const [open,setOpen]=useState(false);const {permission,enable}=useBrowserNotifications();const toggle=async()=>{if(!open&&permission==="default")await enable();setOpen(!open);};return <div className={styles.dock}>{open&&<div className={styles.panel}><ChatPanel compact onMinimize={()=>setOpen(false)}/></div>}<button className={styles.launcher} onClick={toggle} aria-label={open?"Minimize messages":"Open messages"}>{open?"−":"✦"}</button></div>}
