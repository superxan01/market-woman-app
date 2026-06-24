"use client";
import { useCallback,useState } from "react";
export function useBrowserNotifications(){const [permission,setPermission]=useState<NotificationPermission>(()=>typeof Notification==="undefined"?"default":Notification.permission);const enable=useCallback(async()=>{if(typeof Notification==="undefined")return;setPermission(await Notification.requestPermission());},[]);const notify=useCallback((title:string,body:string)=>{if(typeof Notification!=="undefined"&&Notification.permission==="granted"&&document.hidden)new Notification(title,{body});},[]);return{permission,enable,notify};}
