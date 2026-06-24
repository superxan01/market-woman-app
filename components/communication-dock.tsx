"use client";
import { useState } from "react";
import { ChatPanel } from "./chat-panel";
import styles from "./communication-dock.module.css";
export function CommunicationDock(){const [open,setOpen]=useState(false);return <div className={styles.dock}>{open&&<div className={styles.panel}><ChatPanel compact onMinimize={()=>setOpen(false)}/></div>}<button className={styles.launcher} onClick={()=>setOpen(!open)} aria-label={open?"Minimize messages":"Open messages"}>{open?"−":"✦"}</button></div>}
