import React from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Stack,
  Tag,
  TagLabel,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { FiUploadCloud, FiFileText, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { uploadAndIngest, type ActiveDoc } from "../lib/api";
import { useNavigate } from "react-router-dom";

const ACTIVE_DOC_KEY = "rag_active_doc";

function loadActiveDoc(): ActiveDoc | null {
  const raw = localStorage.getItem(ACTIVE_DOC_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveDoc;
  } catch {
    return null;
  }
}

function saveActiveDoc(doc: ActiveDoc) {
  localStorage.setItem(ACTIVE_DOC_KEY, JSON.stringify(doc));
}

export default function UploadPage() {
  const toast = useToast();
  const nav = useNavigate();

  const [collection, setCollection] = React.useState<string>(() => loadActiveDoc()?.collection || "demo");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const [activeDoc, setActiveDoc] = React.useState<ActiveDoc | null>(() => loadActiveDoc());
  const [busy, setBusy] = React.useState(false);

  const statusColor = (s?: ActiveDoc["status"]) => {
    switch (s) {
      case "ready":
        return "green";
      case "uploading":
      case "ingesting":
        return "blue";
      case "error":
        return "red";
      default:
        return "gray";
    }
  };

  const canSubmit = !!file && !busy;

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast({ status: "error", title: "Please choose a PDF file." });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;

    const docBase: ActiveDoc = {
      collection,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      status: "uploading",
    };

    setBusy(true);
    setActiveDoc(docBase);
    saveActiveDoc(docBase);

    try {
      setActiveDoc({ ...docBase, status: "uploading" });
      saveActiveDoc({ ...docBase, status: "uploading" });

      await uploadAndIngest({ file, collection });

      const readyDoc: ActiveDoc = { ...docBase, status: "ready" };
      setActiveDoc(readyDoc);
      saveActiveDoc(readyDoc);

      toast({ status: "success", title: "Uploaded & ingested", description: "Your document is ready for chat." });
      // Optional: auto-navigate to chat
      nav("/chat");
    } catch (e: any) {
      const msg = e?.message || "Something went wrong.";
      const errDoc: ActiveDoc = { ...docBase, status: "error", error: msg };
      setActiveDoc(errDoc);
      saveActiveDoc(errDoc);
      toast({ status: "error", title: "Upload/ingest failed", description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex direction={{ base: "column", lg: "row" }} gap={6} align="stretch">
      {/* Left: Upload */}
      <Card flex="1" borderRadius="2xl" boxShadow="sm">
        <CardHeader pb={3}>
          <Text fontSize="xl" fontWeight="800" letterSpacing="-0.02em">
            Upload & Ingest
          </Text>
          <Text color="gray.600" mt={1}>
            Drop a PDF to build a searchable index for chat.
          </Text>
        </CardHeader>
        <Divider />
        <CardBody>
          <Stack spacing={5}>
            <FormControl>
              <FormLabel fontWeight="700">Collection</FormLabel>
              <Input
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="demo"
                bg="white"
              />
              <Text fontSize="sm" color="gray.500" mt={2}>
                Collections let you isolate document sets (e.g. demo, fitsense, client-a).
              </Text>
            </FormControl>

            <Box
              border="2px dashed"
              borderColor={dragOver ? "blue.400" : "gray.200"}
              bg={dragOver ? "blue.50" : "white"}
              borderRadius="2xl"
              p={6}
              transition="all 0.15s ease"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files?.[0] || null;
                onPick(dropped);
              }}
            >
              <VStack spacing={3} textAlign="center">
                <Box
                  w="56px"
                  h="56px"
                  borderRadius="20px"
                  bg="gray.900"
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FiUploadCloud} boxSize={6} />
                </Box>

                <Text fontWeight="800">Drag & drop your PDF here</Text>
                <Text color="gray.600" fontSize="sm">
                  Or click to browse (PDF only)
                </Text>

                <Input
                  type="file"
                  accept="application/pdf"
                  display="none"
                  id="pdf-file-input"
                  onChange={(e) => onPick(e.target.files?.[0] || null)}
                />
                <Button
                  as="label"
                  htmlFor="pdf-file-input"
                  variant="outline"
                  borderRadius="xl"
                  fontWeight="700"
                >
                  Choose File
                </Button>

                {file && (
                  <HStack pt={2} spacing={3}>
                    <Icon as={FiFileText} />
                    <Text fontWeight="700">{file.name}</Text>
                  </HStack>
                )}
              </VStack>
            </Box>

            <Button
              colorScheme="blue"
              borderRadius="xl"
              size="lg"
              fontWeight="800"
              isLoading={busy}
              loadingText="Uploading & ingesting…"
              isDisabled={!canSubmit}
              onClick={handleSubmit}
            >
              Upload & Ingest
            </Button>
          </Stack>
        </CardBody>
      </Card>

      {/* Right: Active Document */}
      <Card w={{ base: "100%", lg: "420px" }} borderRadius="2xl" boxShadow="sm">
        <CardHeader pb={3}>
          <Text fontSize="lg" fontWeight="800">
            Active Document
          </Text>
          <Text color="gray.600" mt={1} fontSize="sm">
            This is what the chat will use as context.
          </Text>
        </CardHeader>
        <Divider />
        <CardBody>
          {!activeDoc ? (
            <Box>
              <Text fontWeight="700">No document loaded yet.</Text>
              <Text color="gray.600" mt={2} fontSize="sm">
                Upload a PDF to make it searchable.
              </Text>
            </Box>
          ) : (
            <Stack spacing={4}>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontWeight="800" noOfLines={2}>
                    {activeDoc.filename}
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Collection: <b>{activeDoc.collection}</b>
                  </Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Updated: {new Date(activeDoc.uploadedAt).toLocaleString()}
                  </Text>
                </Box>

                <Tag colorScheme={statusColor(activeDoc.status)} borderRadius="999px" px={3} py={1}>
                  <TagLabel fontWeight="800" textTransform="uppercase" fontSize="xs">
                    {activeDoc.status}
                  </TagLabel>
                </Tag>
              </HStack>

              <Card variant="outline" borderRadius="xl">
                <CardBody>
                  <HStack align="start" spacing={3}>
                    <Icon
                      as={activeDoc.status === "ready" ? FiCheckCircle : activeDoc.status === "error" ? FiAlertCircle : FiUploadCloud}
                      color={activeDoc.status === "ready" ? "green.500" : activeDoc.status === "error" ? "red.500" : "blue.500"}
                      boxSize={5}
                      mt="2px"
                    />
                    <Box>
                      {activeDoc.status === "ready" && (
                        <>
                          <Text fontWeight="800">Ready for chat</Text>
                          <Text fontSize="sm" color="gray.600" mt={1}>
                            Go to Chat and ask for summaries, details, or specific questions.
                          </Text>
                        </>
                      )}

                      {(activeDoc.status === "uploading" || activeDoc.status === "ingesting") && (
                        <>
                          <Text fontWeight="800">Processing…</Text>
                          <Text fontSize="sm" color="gray.600" mt={1}>
                            Please wait. This usually takes a few seconds.
                          </Text>
                        </>
                      )}

                      {activeDoc.status === "error" && (
                        <>
                          <Text fontWeight="800">Something went wrong</Text>
                          <Text fontSize="sm" color="gray.600" mt={1}>
                            {activeDoc.error || "Unknown error"}
                          </Text>
                        </>
                      )}

                      {activeDoc.status === "idle" && (
                        <Text fontWeight="800">Idle</Text>
                      )}
                    </Box>
                  </HStack>
                </CardBody>
              </Card>
            </Stack>
          )}
        </CardBody>
      </Card>
    </Flex>
  );
}
