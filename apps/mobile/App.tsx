import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView, ScrollView, Text, View, Pressable, TextInput,
  StyleSheet, ActivityIndicator, Alert, Switch
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
    })
  : null;

type Listing = {
  id: string; title: string; description: string | null; food_category: string;
  quantity: number; quantity_unit: string; city: string; country_code: string;
  available_until: string; organization_name: string; allergens: string[] | null; dietary_tags: string[] | null;
};
type Tab = "Home" | "Donate" | "Request" | "Manage" | "Account";
type Country = { code: string; name: string };
type ManagedReservation = { id: string; quantity: number; status: string; created_at: string; listingTitle: string; unit: string };
type ManagedCharityRequest = { id: string; city: string; country_code: string; household_size: number; food_needs: string[]; notes: string | null; status: string; created_at: string };
type ManagedLogisticsJob = { id: string; reservation_id: string; quantity: number; title: string; unit: string; city: string; country_code: string; pickup_address: string | null; available_from: string; available_until: string };

export default function App() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservationQuantities, setReservationQuantities] = useState<Record<string, string>>({});
  const [managedReservations, setManagedReservations] = useState<ManagedReservation[]>([]);
  const [charityRequests, setCharityRequests] = useState<ManagedCharityRequest[]>([]);
  const [logisticsJobs, setLogisticsJobs] = useState<ManagedLogisticsJob[]>([]);
  const [countries, setCountries] = useState<Country[]>([{ code: "NG", name: "Nigeria" }]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("Home");
  const [org, setOrg] = useState({ name: "", kind: "charity", country: "NG", description: "" });
  const [donation, setDonation] = useState({
    title: "", category: "Produce", quantity: "1", unit: "kg", country: "NG",
    city: "", pickup: "", description: "", allergens: "", dietaryTags: ""
  });
  const [request, setRequest] = useState({
    country: "NG", city: "", household: "1", needs: "", notes: "", share: false
  });
  const [busy, setBusy] = useState(false);

  async function refreshListings() {
    if (!supabase) return;
    const { data, error } = await supabase.from("food_marketplace")
      .select("id,title,description,food_category,quantity,quantity_unit,city,country_code,available_until,organization_name,allergens,dietary_tags")
      .order("available_until", { ascending: true }).limit(30);
    if (error) setMessage(error.message);
    else setListings((data ?? []) as Listing[]);
  }

  useEffect(() => {
    if (!supabase) {
      setMessage("Set the Expo Supabase environment variables to connect WORLDLINK.");
      setLoading(false);
      return;
    }
    supabase.from("countries").select("code,name").eq("is_enabled", true).order("name")
      .then(({ data, error }) => { if (!error && data?.length) setCountries(data as Country[]); });
    supabase.auth.getUser()
      .then(({ data }) => setUserEmail(data.user?.email ?? null))
      .finally(() => setLoading(false));
    refreshListings();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadManagedWork() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setManagedReservations([]); setCharityRequests([]); setLogisticsJobs([]); return; }
    const { data: members, error: memberError } = await supabase.from("organization_members")
      .select("organization_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "manager"]);
    if (memberError) { setMessage(memberError.message); return; }
    const ids = (members ?? []).map((row) => row.organization_id);
    if (!ids.length) { setManagedReservations([]); setCharityRequests([]); setLogisticsJobs([]); return; }
    const { data: orgs, error: orgError } = await supabase.from("organizations")
      .select("id,kind,verification_status").in("id", ids);
    if (orgError) { setMessage(orgError.message); return; }
    const verified = orgs ?? [];
    const donorIds = verified.filter((org) => ["business", "community"].includes(org.kind) && org.verification_status === "verified").map((org) => org.id);
    const charityIds = verified.filter((org) => org.kind === "charity" && org.verification_status === "verified").map((org) => org.id);

    if (donorIds.length) {
      const { data: listings, error: listingError } = await supabase.from("food_listings")
        .select("id,title,quantity_unit").in("organization_id", donorIds);
      if (listingError) { setMessage(listingError.message); return; }
      const listingMap = new Map<string, { id: string; title: string; quantity_unit: string }>();
      for (const item of listings ?? []) listingMap.set(item.id, item);
      const listingIds = Array.from(listingMap.keys());
      if (listingIds.length) {
        const { data: reservations, error: reservationError } = await supabase.from("reservations")
          .select("id,listing_id,quantity,status,created_at").in("listing_id", listingIds)
          .in("status", ["requested", "accepted"]).order("created_at", { ascending: false }).limit(50);
        if (reservationError) { setMessage(reservationError.message); return; }
        setManagedReservations((reservations ?? []).map((item) => {
          const listing = listingMap.get(item.listing_id);
          return { ...item, listingTitle: listing?.title ?? "Food listing", unit: listing?.quantity_unit ?? "" };
        }));
      } else setManagedReservations([]);
    } else setManagedReservations([]);

    if (charityIds.length) {
      const { data: requests, error: requestError } = await supabase.from("assistance_requests")
        .select("id,city,country_code,household_size,food_needs,notes,status,created_at")
        .in("target_organization_id", charityIds).eq("status", "matched")
        .order("created_at", { ascending: false }).limit(50);
      if (requestError) { setMessage(requestError.message); return; }
      setCharityRequests((requests ?? []) as ManagedCharityRequest[]);
    } else setCharityRequests([]);

    const logisticsIds = verified.filter((org) => org.kind === "logistics" && org.verification_status === "verified").map((org) => org.id);
    if (logisticsIds.length) {
      const { data: assignments, error: assignmentError } = await supabase.from("reservation_logistics_assignments")
        .select("id,reservation_id,logistics_organization_id,status,assigned_at")
        .in("logistics_organization_id", logisticsIds).eq("status", "assigned");
      if (assignmentError) { setMessage(assignmentError.message); return; }
      const reservationIds = (assignments ?? []).map((item) => item.reservation_id);
      if (reservationIds.length) {
        const { data: reservations, error: reservationError } = await supabase.from("reservations")
          .select("id,listing_id,quantity").in("id", reservationIds);
        if (reservationError) { setMessage(reservationError.message); return; }
        const listingIds = (reservations ?? []).map((item) => item.listing_id);
        const { data: pickupListings, error: pickupError } = await supabase.from("food_listings")
          .select("id,title,quantity_unit,city,country_code,pickup_address,available_from,available_until")
          .in("id", listingIds);
        if (pickupError) { setMessage(pickupError.message); return; }
        const reservationMap = new Map<string, { id: string; listing_id: string; quantity: number }>();
        for (const item of reservations ?? []) reservationMap.set(item.id, item);
        const pickupMap = new Map<string, { id: string; title: string; quantity_unit: string; city: string; country_code: string; pickup_address: string | null; available_from: string; available_until: string }>();
        for (const item of pickupListings ?? []) pickupMap.set(item.id, item);
        setLogisticsJobs((assignments ?? []).flatMap((assignment) => {
          const reservation = reservationMap.get(assignment.reservation_id);
          const listing = reservation ? pickupMap.get(reservation.listing_id) : undefined;
          return reservation && listing ? [{
            id: assignment.id, reservation_id: assignment.reservation_id, quantity: reservation.quantity,
            title: listing.title, unit: listing.quantity_unit, city: listing.city, country_code: listing.country_code,
            pickup_address: listing.pickup_address, available_from: listing.available_from, available_until: listing.available_until
          }] : [];
        }));
      } else setLogisticsJobs([]);
    } else setLogisticsJobs([]);
  }

  useEffect(() => { if (supabase) { refreshListings(); loadManagedWork(); } }, [userEmail]);

  async function sendCode() {
    if (!supabase || !email.trim()) return;
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    if (error) { setMessage(error.message); return; }
    setSent(true);
    setMessage("A sign-in code has been sent to your email.");
  }

  async function verifyCode() {
    if (!supabase) return;
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "email" });
    if (error) { setMessage(error.message); return; }
    setUserEmail(data.user?.email ?? email);
    setMessage("You are signed in.");
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setUserEmail(null);
    setTab("Home");
  }

  async function registerOrganization() {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in before registering an organisation.");
      const { error } = await supabase.from("organizations").insert({
        name: org.name.trim(), kind: org.kind, country_code: org.country.toUpperCase(),
        description: org.description.trim(), created_by: user.id
      });
      if (error) throw error;
      setMessage("Organisation registered and awaiting verification. You are its owner.");
      setOrg({ name: "", kind: "charity", country: "NG", description: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to register organisation.");
    } finally { setBusy(false); }
  }

  async function publishDonation() {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in before publishing a donation.");
      const { data: memberships, error: membershipError } = await supabase.from("organization_members")
        .select("organization_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "manager"]);
      if (membershipError) throw membershipError;
      let verifiedOrg: string | null = null;
      for (const member of memberships ?? []) {
        const { data } = await supabase.from("organizations").select("id,verification_status")
          .eq("id", member.organization_id).eq("verification_status", "verified").maybeSingle();
        if (data) { verifiedOrg = data.id; break; }
      }
      if (!verifiedOrg) throw new Error("A verified donor organisation is required. Register your organisation in Account first.");
      const now = new Date();
      const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { error } = await supabase.from("food_listings").insert({
        organization_id: verifiedOrg, title: donation.title.trim(), food_category: donation.category,
        quantity: Number(donation.quantity), quantity_unit: donation.unit.trim(),
        country_code: donation.country.toUpperCase(), city: donation.city.trim(),
        pickup_address: donation.pickup.trim(), description: donation.description.trim(),
        allergens: donation.allergens.split(",").map((item) => item.trim()).filter(Boolean),
        dietary_tags: donation.dietaryTags.split(",").map((item) => item.trim()).filter(Boolean),
        available_from: now.toISOString(), available_until: until.toISOString(), status: "available"
      });
      if (error) throw error;
      setMessage("Donation published. It is visible in the marketplace.");
      setDonation({ title: "", category: "Produce", quantity: "1", unit: "kg", country: "NG", city: "", pickup: "", description: "", allergens: "", dietaryTags: "" });
      await refreshListings(); setTab("Home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish donation.");
    } finally { setBusy(false); }
  }

  async function submitRequest() {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in before submitting a private assistance request.");
      const { error } = await supabase.from("assistance_requests").insert({
        requester_id: user.id, country_code: request.country.toUpperCase(), city: request.city.trim(),
        household_size: Number(request.household),
        food_needs: request.needs.split(",").map((item) => item.trim()).filter(Boolean),
        notes: request.notes.trim(), share_with_assigned_charity: request.share,
        consent_at: request.share ? new Date().toISOString() : null
      });
      if (error) throw error;
      setMessage("Your private assistance request has been submitted.");
      setRequest({ country: "NG", city: "", household: "1", needs: "", notes: "", share: false });
      setTab("Home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit request.");
    } finally { setBusy(false); }
  }

  async function reserve(listing: Listing) {
    if (!supabase) return;
    if (!userEmail) { setMessage("Sign in before requesting food."); setTab("Account"); return; }
    const quantity = Number(reservationQuantities[listing.id] ?? "1");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number(listing.quantity)) {
      Alert.alert("Check quantity", "Enter a quantity greater than zero and no more than the available amount.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.rpc("reserve_food_listing", { p_listing_id: listing.id, p_quantity: quantity });
      if (error) throw error;
      Alert.alert("Request sent", "The donor organisation must confirm your reservation.");
    } catch (error) {
      Alert.alert("Reservation not completed", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  }

  const countryChoices = (selected: string, onSelect: (code: string) => void) => (
    <View style={s.countryChoices}>
      {countries.map((country) => (
        <Pressable key={country.code} onPress={() => onSelect(country.code)}
          style={[s.countryChip, selected === country.code && s.countryChipActive]}>
          <Text style={[s.countryChipText, selected === country.code && s.countryChipTextActive]}>{country.code}</Text>
        </Pressable>
      ))}
    </View>
  );

  const organisationKindChoices = (
    <View style={s.countryChoices}>
      {["business", "charity", "logistics", "community", "other"].map((kind) => (
        <Pressable key={kind} onPress={() => setOrg((old) => ({ ...old, kind }))}
          style={[s.countryChip, org.kind === kind && s.countryChipActive]}>
          <Text style={[s.countryChipText, org.kind === kind && s.countryChipTextActive]}>{kind}</Text>
        </Pressable>
      ))}
    </View>
  );

  async function respondReservation(id: string, decision: "accepted" | "rejected") {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("respond_to_food_reservation", { p_reservation_id: id, p_decision: decision });
      if (error) throw error;
      await loadManagedWork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update reservation.");
    } finally { setBusy(false); }
  }

  async function confirmHandover(id: string) {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("complete_food_handover", { p_reservation_id: id, p_notes: "Collection confirmed in WORLDLINK mobile app" });
      if (error) throw error;
      await loadManagedWork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm collection.");
    } finally { setBusy(false); }
  }

  async function updateCharityRequest(id: string, status: "fulfilled" | "closed") {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("update_assistance_request_status", { p_request_id: id, p_status: status });
      if (error) throw error;
      await loadManagedWork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update assistance request.");
    } finally { setBusy(false); }
  }

  async function completeLogisticsJob(id: string) {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("complete_logistics_handover", {
        p_reservation_id: id,
        p_notes: "Collection and handover completed in WORLDLINK mobile app"
      });
      if (error) throw error;
      await loadManagedWork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete logistics handover.");
    } finally { setBusy(false); }
  }

  const field = (label: string, value: string, onChangeText: (text: string) => void, placeholder = "") => (
    <View style={s.field}><Text style={s.label}>{label}</Text><TextInput style={s.input}
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#819087" /></View>
  );

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}><Text style={s.brand}>WORLDLINK</Text><Text style={s.kicker}>LESS WASTE. MORE COMMUNITY.</Text></View>
      <View style={s.tabs}>
        {(["Home", "Donate", "Request", "Manage", "Account"] as Tab[]).map((item) => (
          <Pressable key={item} onPress={() => { setTab(item); setMessage(""); }}
            style={[s.tab, tab === item && s.tabActive]}><Text style={[s.tabText, tab === item && s.tabTextActive]}>{item}</Text></Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator size="large" color="#176b45" /> : null}
        {tab === "Home" && <>
          <Text style={s.heading}>Good food should reach people.</Text>
          <Text style={s.copy}>Connect donors, charities, communities and delivery partners.</Text>
          <Text style={s.section}>Available food</Text>
          {listings.length ? listings.map((item) => <View key={item.id} style={s.card}>
            <Text style={s.title}>{item.title}</Text><Text style={s.copy}>{item.food_category} · {item.quantity} {item.quantity_unit}</Text>
            <Text style={s.copy}>{item.city}, {item.country_code} · {item.organization_name}</Text>
            <Text style={s.copy}>Allergens: {item.allergens?.join(", ") || "Not supplied — confirm with donor"}</Text>
            {!!item.dietary_tags?.length && <Text style={s.copy}>Dietary: {item.dietary_tags.join(", ")}</Text>}
            <Text style={s.label}>Quantity to request</Text>
            <TextInput keyboardType="decimal-pad" value={reservationQuantities[item.id] ?? "1"} onChangeText={(value) => setReservationQuantities((old) => ({ ...old, [item.id]: value }))} style={s.input} />
            <Pressable style={s.button} disabled={busy} onPress={() => reserve(item)}><Text style={s.buttonText}>Request {reservationQuantities[item.id] ?? "1"} {item.quantity_unit}</Text></Pressable>
          </View>) : <View style={s.card}><Text style={s.copy}>No active listings yet. Verified donor listings will appear here.</Text></View>}
        </>}
        {tab === "Donate" && <View style={s.card}>
          <Text style={s.section}>Donate surplus food</Text>
          <Text style={s.copy}>A verified donor organisation is required before publishing.</Text>
          {field("Food name", donation.title, (v) => setDonation((x) => ({ ...x, title: v })))}
          {field("Category", donation.category, (v) => setDonation((x) => ({ ...x, category: v })), "Produce, bakery, dairy…")}
          {field("Quantity", donation.quantity, (v) => setDonation((x) => ({ ...x, quantity: v })))}
          {field("Unit", donation.unit, (v) => setDonation((x) => ({ ...x, unit: v })), "kg, packs, portions")}
          <Text style={s.label}>Country</Text>
          {countryChoices(donation.country, (country) => setDonation((x) => ({ ...x, country })) )}
          {field("City", donation.city, (v) => setDonation((x) => ({ ...x, city: v })))}
          {field("Private pickup address", donation.pickup, (v) => setDonation((x) => ({ ...x, pickup: v })))}
          {field("Allergens (comma-separated)", donation.allergens, (v) => setDonation((x) => ({ ...x, allergens: v })), "Peanuts, milk, wheat")}
          {field("Dietary tags (comma-separated)", donation.dietaryTags, (v) => setDonation((x) => ({ ...x, dietaryTags: v })), "Vegetarian, halal, vegan")}
          {field("Description", donation.description, (v) => setDonation((x) => ({ ...x, description: v })))}
          <Pressable style={s.button} disabled={busy} onPress={publishDonation}><Text style={s.buttonText}>{busy ? "Publishing…" : "Publish donation"}</Text></Pressable>
        </View>}
        {tab === "Request" && <View style={s.card}>
          <Text style={s.section}>Request food assistance</Text>
          <Text style={s.copy}>Your request is private by default. Share only information needed to coordinate support.</Text>
          <Text style={s.label}>Country</Text>
          {countryChoices(request.country, (country) => setRequest((x) => ({ ...x, country })) )}
          {field("City", request.city, (v) => setRequest((x) => ({ ...x, city: v })))}
          {field("Household size", request.household, (v) => setRequest((x) => ({ ...x, household: v })))}
          {field("Food needs", request.needs, (v) => setRequest((x) => ({ ...x, needs: v })), "Rice, vegetables…")}
          {field("Additional information", request.notes, (v) => setRequest((x) => ({ ...x, notes: v })))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Switch value={request.share} onValueChange={(value) => setRequest((x) => ({ ...x, share: value }))} /><Text style={s.copy}>I consent to sharing this request with one verified charity assigned to help me.</Text></View>
          <Pressable style={s.button} disabled={busy} onPress={submitRequest}><Text style={s.buttonText}>{busy ? "Submitting…" : "Submit private request"}</Text></Pressable>
        </View>}
        {tab === "Manage" && <>
          <Text style={s.heading}>Organisation workspace</Text>
          <Text style={s.copy}>Manage donor reservations and assistance requests assigned to your verified charity.</Text>
          <View style={s.card}>
            <Text style={s.section}>Incoming food reservations</Text>
            {!managedReservations.length && <Text style={s.copy}>No pending or accepted reservations for your verified donor organisations.</Text>}
            {managedReservations.map((item) => <View key={item.id} style={s.card}>
              <Text style={s.title}>{item.listingTitle}</Text>
              <Text style={s.copy}>{item.quantity} {item.unit} · {item.status}</Text>
              {item.status === "requested" && <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable style={s.button} disabled={busy} onPress={() => respondReservation(item.id, "accepted")}><Text style={s.buttonText}>Accept</Text></Pressable>
                <Pressable style={s.buttonSecondary} disabled={busy} onPress={() => respondReservation(item.id, "rejected")}><Text style={s.buttonSecondaryText}>Decline</Text></Pressable>
              </View>}
              {item.status === "accepted" && <Pressable style={s.button} disabled={busy} onPress={() => confirmHandover(item.id)}><Text style={s.buttonText}>Confirm handover</Text></Pressable>}
            </View>)}
          </View>
          <View style={s.card}>
            <Text style={s.section}>Assistance requests assigned to your charity</Text>
            {!charityRequests.length && <Text style={s.copy}>No consented assistance requests are currently assigned to your verified charity.</Text>}
            {charityRequests.map((item) => <View key={item.id} style={s.card}>
              <Text style={s.title}>{item.city}, {item.country_code}</Text>
              <Text style={s.copy}>Household size: {item.household_size}</Text>
              <Text style={s.copy}>Needs: {item.food_needs?.join(", ") || "Not specified"}</Text>
              {!!item.notes && <Text style={s.copy}>{item.notes}</Text>}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable style={s.button} disabled={busy} onPress={() => updateCharityRequest(item.id, "fulfilled")}><Text style={s.buttonText}>Fulfilled</Text></Pressable>
                <Pressable style={s.buttonSecondary} disabled={busy} onPress={() => updateCharityRequest(item.id, "closed")}><Text style={s.buttonSecondaryText}>Close</Text></Pressable>
              </View>
            </View>)}
          </View>
          <View style={s.card}>
            <Text style={s.section}>Logistics collection assignments</Text>
            {!logisticsJobs.length && <Text style={s.copy}>No collection jobs are assigned to your verified logistics organisations.</Text>}
            {logisticsJobs.map((job) => <View key={job.id} style={s.card}>
              <Text style={s.title}>{job.title}</Text>
              <Text style={s.copy}>{job.quantity} {job.unit} · {job.city}, {job.country_code}</Text>
              <Text style={s.copy}>Pickup: {job.pickup_address || "Confirm pickup point with donor"}</Text>
              <Text style={s.copy}>Window: {new Date(job.available_from).toLocaleString()} – {new Date(job.available_until).toLocaleString()}</Text>
              <Pressable style={s.button} disabled={busy} onPress={() => completeLogisticsJob(job.reservation_id)}><Text style={s.buttonText}>Confirm collection and handover</Text></Pressable>
            </View>)}
          </View>
          <Pressable style={s.buttonSecondary} onPress={() => { loadManagedWork(); refreshListings(); }}><Text style={s.buttonSecondaryText}>Refresh workspace</Text></Pressable>
        </>}
        {tab === "Account" && <>
          <View style={s.card}>
            {userEmail ? <>
              <Text style={s.title}>Signed in</Text><Text style={s.copy}>{userEmail}</Text>
              <Pressable onPress={signOut}><Text style={s.link}>Sign out</Text></Pressable>
            </> : <>
              <Text style={s.title}>Sign in with email</Text>
              {field("Email address", email, setEmail, "name@example.com")}
              {sent && field("Email code", otp, setOtp, "6-digit code")}
              <Pressable style={s.button} onPress={sent ? verifyCode : sendCode}><Text style={s.buttonText}>{sent ? "Verify code" : "Send sign-in code"}</Text></Pressable>
            </>}
          </View>
          {userEmail && <View style={s.card}>
            <Text style={s.section}>Register an organisation</Text>
            {field("Organisation name", org.name, (v) => setOrg((x) => ({ ...x, name: v })))}
            <Text style={s.label}>Organisation type</Text>
            {organisationKindChoices}
            <Text style={s.label}>Country</Text>
            {countryChoices(org.country, (country) => setOrg((x) => ({ ...x, country })) )}
            {field("Description", org.description, (v) => setOrg((x) => ({ ...x, description: v })))}
            <Pressable style={s.button} disabled={busy} onPress={registerOrganization}><Text style={s.buttonText}>{busy ? "Submitting…" : "Register organisation"}</Text></Pressable>
            <Text style={s.foot}>New organisations remain pending until reviewed by WORLDLINK administrators.</Text>
          </View>}
        </>}
        {!!message && <Text style={s.notice}>{message}</Text>}
        <Text style={s.foot}>WORLDLINK · Follow local food-safety and privacy requirements.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f8f5" },
  top: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  brand: { fontSize: 25, fontWeight: "800", color: "#176b45" },
  kicker: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "#176b45", marginTop: 4 },
  heading: { fontSize: 34, fontWeight: "800", color: "#17231d", lineHeight: 40 },
  copy: { fontSize: 14, lineHeight: 21, color: "#596960" },
  section: { fontSize: 21, fontWeight: "800", marginBottom: 8, color: "#17231d" },
  tabs: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 6, backgroundColor: "#eaf0ea" },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#176b45" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#405349" },
  tabTextActive: { color: "white" },
  card: { backgroundColor: "white", borderRadius: 14, padding: 17, borderWidth: 1, borderColor: "#e1e8e1", gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#176b45" },
  field: { gap: 5 },
  countryChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  countryChip: { borderWidth: 1, borderColor: "#cbd8ce", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "white" },
  countryChipActive: { backgroundColor: "#176b45", borderColor: "#176b45" },
  countryChipText: { color: "#35483d", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  countryChipTextActive: { color: "white" },
  label: { fontSize: 13, fontWeight: "700", color: "#35483d" },
  input: { borderWidth: 1, borderColor: "#cbd8ce", borderRadius: 8, padding: 11, color: "#17231d", backgroundColor: "#fff" },
  button: { backgroundColor: "#176b45", padding: 13, borderRadius: 8, alignItems: "center", marginTop: 4 },
  buttonText: { color: "white", fontWeight: "700" },
  buttonSecondary: { backgroundColor: "white", borderWidth: 1, borderColor: "#b8cbbd", padding: 13, borderRadius: 8, alignItems: "center", marginTop: 4 },
  buttonSecondaryText: { color: "#176b45", fontWeight: "700" },
  link: { color: "#176b45", fontWeight: "700", paddingVertical: 8 },
  notice: { color: "#176b45", backgroundColor: "#e7f3ea", padding: 12, borderRadius: 8, lineHeight: 20 },
  foot: { fontSize: 11, color: "#68766d", marginTop: 12 }
});
