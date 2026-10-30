import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View, Pressable, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl=process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey,{auth:{storage:AsyncStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}}):null;
type Listing={id:string;title:string;description:string|null;food_category:string;quantity:number;quantity_unit:string;city:string;country_code:string;available_until:string};
export default function App(){
 const [email,setEmail]=useState("");const [otp,setOtp]=useState("");const [sent,setSent]=useState(false);
 const [userEmail,setUserEmail]=useState<string|null>(null);const [listings,setListings]=useState<Listing[]>([]);
 const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");
 useEffect(()=>{if(!supabase){setMessage("Set the Supabase environment variables to connect WORLDLINK.");setLoading(false);return;}
  supabase.auth.getUser().then(({data})=>setUserEmail(data.user?.email??null)).finally(()=>setLoading(false));
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUserEmail(session?.user.email??null));
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{if(!supabase)return;
  supabase.from("food_marketplace").select("id,title,description,food_category,quantity,quantity_unit,city,country_code,available_until").eq("status","available").gt("available_until",new Date().toISOString()).order("available_until",{ascending:true}).limit(30).then(({data,error})=>{if(error)setMessage(error.message);else setListings((data??[]) as Listing[]);});
 },[userEmail]);
 async function sendCode(){if(!supabase)return;setMessage("");const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error){setMessage(error.message);return;}setSent(true);setMessage("A sign-in code has been sent to your email.");}
 async function verifyCode(){if(!supabase)return;const {data,error}=await supabase.auth.verifyOtp({email,token:otp,type:"email"});if(error){setMessage(error.message);return;}setUserEmail(data.user?.email??email);setMessage("You are signed in.");}
 async function signOut(){if(supabase)await supabase.auth.signOut();setUserEmail(null);}
 return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.wrap}><Text style={s.brand}>WORLDLINK</Text><Text style={s.kicker}>LESS WASTE. MORE COMMUNITY.</Text><Text style={s.heading}>Good food should reach people.</Text><Text style={s.copy}>Connect donors, charities, communities and delivery partners.</Text>
 {loading?<ActivityIndicator/>:userEmail?<View style={s.card}><Text style={s.title}>Signed in</Text><Text style={s.copy}>{userEmail}</Text><Pressable onPress={signOut}><Text style={s.link}>Sign out</Text></Pressable></View>:<View style={s.card}><Text style={s.title}>Sign in with email</Text><TextInput style={s.input} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>{sent&&<TextInput style={s.input} placeholder="6-digit email code" keyboardType="number-pad" value={otp} onChangeText={setOtp}/>}<Pressable style={s.button} onPress={sent?verifyCode:sendCode}><Text style={s.buttonText}>{sent?"Verify code":"Send sign-in code"}</Text></Pressable></View>}
 <Text style={s.section}>Available food</Text>{listings.length?listings.map(item=><View key={item.id} style={s.card}><Text style={s.title}>{item.title}</Text><Text style={s.copy}>{item.food_category} · {item.quantity} {item.quantity_unit}</Text><Text style={s.copy}>{item.city}, {item.country_code}</Text></View>):<View style={s.card}><Text style={s.copy}>No active listings yet. New donor listings will appear here.</Text></View>}
 <Text style={s.section}>More ways to help</Text>{["Donate food","Request food assistance","Charity portal","Delivery partners","Impact dashboard"].map(x=><View key={x} style={s.card}><Text style={s.title}>{x}</Text></View>)}{!!message&&<Text style={s.copy}>{message}</Text>}<Text style={s.foot}>Food listings and accounts use the WORLDLINK Supabase backend.</Text></ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:"#f7f8f5"},wrap:{padding:22,gap:14},brand:{fontSize:25,fontWeight:"800",color:"#176b45"},kicker:{fontSize:11,fontWeight:"700",letterSpacing:2,color:"#176b45",marginTop:30},heading:{fontSize:38,fontWeight:"800",color:"#17231d"},copy:{fontSize:15,lineHeight:23,color:"#596960"},section:{fontSize:22,fontWeight:"800",marginTop:24,color:"#17231d"},card:{backgroundColor:"white",borderRadius:14,padding:18,borderWidth:1,borderColor:"#e1e8e1",gap:9},title:{fontSize:18,fontWeight:"700",color:"#176b45"},input:{borderWidth:1,borderColor:"#cbd8ce",borderRadius:8,padding:12,color:"#17231d"},button:{backgroundColor:"#176b45",padding:14,borderRadius:8,alignItems:"center"},buttonText:{color:"white",fontWeight:"700"},link:{color:"#176b45",fontWeight:"700"},foot:{fontSize:12,color:"#68766d",marginTop:20}});
