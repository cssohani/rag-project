import React from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  HStack,
  Icon,
  Input,
  Spinner,
  Stack,
  Tag,
  TagLabel,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { FiMessageSquare, FiSend, FiFileText, FiTrash2 } from "react-icons/fi";
import { queryDoc, type ActiveDoc, type ChatMessage } from "../lib/api";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "@chakra-ui/react";

const ACTIVE_DOC_KEY = "rag_active_doc";
const CHAT_KEY = "rag_chat_history";

function loadActiveDoc(): ActiveDoc | null {
  const raw = localStorage.getItem(ACTIVE_DOC_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveDoc;
  } catch {
    return null;
  }
}

function loadChat(): ChatMessage[] {
  const raw = localStorage.getItem(CHAT_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveChat(messages: ChatMessage[]) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
}

export default function ChatPage() {
  const toast = useToast();
  const [activeDoc, setActiveDoc] = React.useState<ActiveDoc | null>(() => loadActiveDoc());
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => loadChat());
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => setActiveDoc(loadActiveDoc()), 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    saveChat(messages);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ready = activeDoc?.status === "ready";

  const clearChat = () => {
    setMessages([]);
    saveChat([]);
    toast({ status: "info", title: "Chat cleared" });
  };

  const send = async () => {
    const question = input.trim();
    if (!question) return;

    if (!activeDoc || activeDoc.status !== "ready") {
      toast({ status: "warning", title: "Upload a PDF first", description: "Go to Upload & Ingest to set an active document." });
      return;
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const result = await queryDoc({ question, collection: activeDoc.collection, k: 4 });
      setMessages([...next, { role: "assistant", content: result.answer }]);
    } catch (e: any) {
      const msg = e?.message || "Query failed.";
      toast({ status: "error", title: "Query failed", description: msg });
      setMessages([
        ...next,
        { role: "assistant", content: `Sorry — I couldn't complete that request.\n\nError: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction={{ base: "column", lg: "row" }} gap={6} align="stretch">
      {/* Left: Active Doc */}
      <Card w={{ base: "100%", lg: "420px" }} borderRadius="2xl" boxShadow="sm">
        <CardHeader pb={3}>
          <HStack justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="800">
              Context
            </Text>
            <Tag colorScheme={ready ? "green" : "gray"} borderRadius="999px" px={3} py={1}>
              <TagLabel fontWeight="800" fontSize="xs" textTransform="uppercase">
                {ready ? "READY" : activeDoc?.status ?? "NONE"}
              </TagLabel>
            </Tag>
          </HStack>
          <Text color="gray.600" mt={1} fontSize="sm">
            Chat answers are based on the active PDF.
          </Text>
        </CardHeader>
        <Divider />
        <CardBody>
          {!activeDoc ? (
            <Box>
              <Text fontWeight="800">No active document</Text>
              <Text color="gray.600" mt={2} fontSize="sm">
                Upload a PDF first.
              </Text>
              <Button
                as={RouterLink}
                to="/upload"
                mt={4}
                colorScheme="blue"
                borderRadius="xl"
                fontWeight="800"
              >
                Go to Upload
              </Button>
            </Box>
          ) : (
            <Stack spacing={4}>
              <HStack align="start" spacing={3}>
                <Box
                  w="44px"
                  h="44px"
                  borderRadius="16px"
                  bg="gray.900"
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FiFileText} />
                </Box>
                <Box>
                  <Text fontWeight="900" noOfLines={2}>
                    {activeDoc.filename}
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Collection: <b>{activeDoc.collection}</b>
                  </Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Updated: {new Date(activeDoc.uploadedAt).toLocaleString()}
                  </Text>
                </Box>
              </HStack>

              {!ready && (
                <Card variant="outline" borderRadius="xl">
                  <CardBody>
                    <Text fontWeight="800">Not ready yet</Text>
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      Return to Upload and ingest a PDF before chatting.
                    </Text>
                    <Button
                      as={RouterLink}
                      to="/upload"
                      mt={3}
                      variant="outline"
                      borderRadius="xl"
                      fontWeight="800"
                    >
                      Upload & Ingest
                    </Button>
                  </CardBody>
                </Card>
              )}

              <Divider />

              <Button
                leftIcon={<Icon as={FiTrash2} />}
                variant="outline"
                borderRadius="xl"
                fontWeight="800"
                onClick={clearChat}
                isDisabled={messages.length === 0}
              >
                Clear chat
              </Button>
            </Stack>
          )}
        </CardBody>
      </Card>

      {/* Right: Chat */}
      <Card flex="1" borderRadius="2xl" boxShadow="sm" overflow="hidden">
        <CardHeader pb={3}>
          <HStack spacing={2}>
            <Icon as={FiMessageSquare} />
            <Text fontSize="xl" fontWeight="900" letterSpacing="-0.02em">
              Chat
            </Text>
          </HStack>
          <Text color="gray.600" mt={1}>
            Ask for summaries, key points, or specific answers.
          </Text>
        </CardHeader>
        <Divider />

        <CardBody p={0}>
          <Flex direction="column" height={{ base: "65vh", lg: "72vh" }}>
            {/* Messages */}
            <Box flex="1" overflowY="auto" px={{ base: 4, md: 6 }} py={5}>
              {messages.length === 0 ? (
                <Box>
                  <Text fontWeight="900">Start a conversation</Text>
                  <Text color="gray.600" mt={2}>
                    Try: “Summarize the document” or “What’s the main goal?”
                  </Text>
                </Box>
              ) : (
                <VStack spacing={3} align="stretch">
                  {messages.map((m, idx) => (
                    <Flex key={idx} justify={m.role === "user" ? "flex-end" : "flex-start"}>
                      <Box
                        maxW="80%"
                        bg={m.role === "user" ? "gray.900" : "white"}
                        color={m.role === "user" ? "white" : "gray.800"}
                        border={m.role === "user" ? "none" : "1px solid"}
                        borderColor={m.role === "user" ? "transparent" : "gray.200"}
                        borderRadius="2xl"
                        px={4}
                        py={3}
                        boxShadow={m.role === "user" ? "sm" : "none"}
                        whiteSpace="pre-wrap"
                      >
                        <Text fontWeight={m.role === "user" ? "700" : "600"} lineHeight="1.55">
                          {m.content}
                        </Text>
                      </Box>
                    </Flex>
                  ))}

                  {loading && (
                    <Flex justify="flex-start">
                      <Box
                        maxW="80%"
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="2xl"
                        px={4}
                        py={3}
                      >
                        <HStack spacing={3}>
                          <Spinner size="sm" />
                          <Text color="gray.600" fontWeight="600">
                            Thinking…
                          </Text>
                        </HStack>
                      </Box>
                    </Flex>
                  )}

                  <div ref={bottomRef} />
                </VStack>
              )}
            </Box>

            <Divider />

            {/* Input */}
            <Box px={{ base: 4, md: 6 }} py={4} bg="white">
              <HStack align="stretch" spacing={3}>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ready ? "Ask a question about your PDF…" : "Upload & ingest a PDF first…"}
                  resize="none"
                  rows={2}
                  borderRadius="xl"
                  fontWeight="600"
                  isDisabled={!ready || loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <Button
                  colorScheme="blue"
                  borderRadius="xl"
                  fontWeight="900"
                  leftIcon={<Icon as={FiSend} />}
                  onClick={() => void send()}
                  isDisabled={!ready || loading || input.trim().length === 0}
                >
                  Send
                </Button>
              </HStack>

              <Text fontSize="xs" color="gray.500" mt={2}>
                Press <b>Enter</b> to send, <b>Shift + Enter</b> for a new line.
              </Text>

              {!ready && (
                <Text fontSize="sm" color="orange.600" mt={3} fontWeight="700">
                  No ready document context.{" "}
                  <Link as={RouterLink} to="/upload" textDecoration="underline">
                    Upload & ingest a PDF
                  </Link>{" "}
                  to enable chat.
                </Text>
              )}
            </Box>
          </Flex>
        </CardBody>
      </Card>
    </Flex>
  );
}
