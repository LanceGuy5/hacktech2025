"use client"

import React, { useEffect } from "react"

import { useState, useRef } from "react"
import axios from "axios"
// import { useChat } from "ai/react"
import { Camera, Mic, Send, ImageIcon, X, User, Bot, TriangleAlert, MoveRight } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { formatAssistantResponse } from "@/utils/utils"

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { id: number, role: "user" | "assistant", content: string | null, image: string | null, isLoading?: boolean }[]
  >([
    { id: 1, role: "assistant", content: "Hi there! How can I assist you today?", image: null },
  ]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [hospitalButton, setHospitalButtom] = useState(false);
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);

  // for voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === "" && !imagePreview) return;

    const userMessage = {
      id: Date.now(),
      role: "user" as "user" | "assistant",
      content: (input.trim() !== "") ? input : null,
      image: imagePreview,
    };

    const loadingMessageId = Date.now() + 1;

    const loadingMessage = {
      id: loadingMessageId,
      role: "assistant" as "user" | "assistant",
      content: "Thinking...",
      image: null,
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setImagePreview(null);
    setSelectedFile(null);

    // reset file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      // Format conversation history for OpenAI
      // Exclude the loading message and simplify to role/content format
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content || ""
      }));

      let formData = new FormData();
      if (input.trim() !== "") formData.append("symptoms", input);
      if (selectedFile) formData.append("photo", selectedFile);

      // Add conversation history as JSON string
      formData.append("conversationHistory", JSON.stringify(conversationHistory));

      const response = await axios.post("/api/postSymptoms", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status !== 200) throw new Error("Server error");

      const formatted = formatAssistantResponse(response.data.result);
      console.log(formatted);

      // Replace loading message with real response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageId
            ? { ...msg, content: formatted.raw, isLoading: false }
            : msg
        )
      );

      // if the severity is bad enough, show a button to navigate to the map
      setHospitalButtom(formatted.severity && formatted.severity >= 6);

      // Store image description if available
      if (selectedFile && formatted.imageDescription) {
        setImageDescriptions(prev => [...prev, formatted.imageDescription]);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageId
            ? { ...msg, content: "Sorry, I couldn't get a response.", isLoading: false }
            : msg
        )
      );
    }
  };

  const toHospitalMap = async () => {
    try {
      // Start with loading state
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: "Analyzing your medical needs to find the best hospital...",
          image: null
        }
      ]);

      // Prepare conversation data
      const conversationText = messages
        .filter(m => m.role === "user" && m.content)
        .map(m => m.content)
        .join("\n");

      // Debug what we're sending
      console.log("DEBUG - Sending to generatePatientNeeds:", {
        conversation: conversationText,
        imageDescriptions: imageDescriptions
      });

      // Call API to generate patient needs
      const response = await axios.post("/api/generatePatientNeeds", {
        conversation: conversationText,
        imageDescriptions: imageDescriptions
      });

      // Debug what we got back
      console.log("DEBUG - Response from generatePatientNeeds:", response.data);

      if (response.data && response.data.patientNeeds) {
        // Debug the exact patient needs object
        console.log("DEBUG - Patient needs object:", response.data.patientNeeds);

        // Store the structured patient needs
        localStorage.setItem('patientNeeds', JSON.stringify(response.data.patientNeeds));
        console.log("DEBUG - Stored in localStorage:", JSON.stringify(response.data.patientNeeds));

        // Navigate to map
        window.location.href = "/map";
      } else {
        throw new Error("Failed to generate patient needs");
      }
    } catch (error) {
      console.error("Error in toHospitalMap:", error);
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: "Sorry, I couldn't analyze your medical needs. Please try again.",
          image: null
        }
      ]);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file); // creates temporary preview link
      setImagePreview(url);
    }
  };

  const clearImagePreview = () => {
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        const result = await axios.post("/api/transcribeAudio", formData);
        setInput(result.data.transcription);
        // console.log(result.data.transcription);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-2 py-2">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">Clarity</h2>
              <p className="text-xs text-slate-500">Get clarity on your medical concerns through text, voice, an images.</p>
            </div>
            <Button variant="outline" size="icon" className="ml-auto" onClick={triggerFileInput}>
              <ImageIcon className="h-4 w-4" />
              <span className="sr-only">Upload image</span>
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {imagePreview && (
            <div className="relative p-3 border-b">
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Uploaded preview"
                  className="w-full h-auto max-h-48 object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={clearImagePreview}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <div className="h-[60vh] overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <Camera className="h-10 w-10 mb-2 text-slate-400" />
                <p className="text-base font-medium">No messages yet</p>
                <p className="text-xs">Start a conversation or upload an image</p>
              </div>
            ) : (
              messages.map((message) => (
                < div
                  key={message.id}
                  className={
                    cn(
                      "flex items-end gap-3 mx-2",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                >
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8 bg-slate-800 text-white flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </Avatar>
                  )}
                  {message.image && <img
                    src={message.image || "/placeholder.svg"}
                    alt="Message image"
                    className="w-10 h-10 rounded-full"
                    onClick={() => {
                      // Handle image click
                    }}
                  />}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%] break-words",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {
                      message.content && (message.content.trim() !== "") &&
                      <div className={`text-sm font-medium ${message.role !== "user" ? 'text-slate-900' : 'text-white'}`}>
                        {message.content}
                      </div>
                    }
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 bg-slate-800 text-white flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 bg-slate-200">
                  <div className="text-xs font-medium"><Bot /></div>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce delay-75"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            {hospitalButton && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="group flex items-center justify-center mt-4 bg-red-500 text-white hover:bg-red-600 hover:text-white cursor-pointer transition-all"
                  onClick={() => toHospitalMap()}
                >
                  <TriangleAlert className="h-4 w-4 mr-2" />
                  <span className="text-sm">Your symptoms may be severe. Find a medical center near you.</span>
                  <MoveRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </div>
            )}
            <div ref={bottomRef} /> {/* dummy ref for auto scrolling */}
          </div>
        </CardContent>

        <CardFooter className="p-3">
          <form onSubmit={onSubmit} className="flex w-full gap-2">
            <div className="relative flex-1">
              <Input value={input} onChange={handleInputChange} placeholder="Type your message..." className="pr-10" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7",
                  isRecording ? "text-red-500 animate-pulse" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Mic className="h-4 w-4" />
                <span className="sr-only">Voice input</span>
              </Button>
            </div>
            <Button className="cursor-pointer" type="submit" size="icon" disabled={isTyping && !imagePreview && input.trim() === ""}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div >
  )
}
