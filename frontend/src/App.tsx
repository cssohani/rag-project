import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Flex,
  HStack,
  Icon,
  Link,
  Spacer,
  Text,
  Badge,
  useColorModeValue,
} from "@chakra-ui/react";
import { healthCheck } from "./lib/api";
import { FiFileText, FiMessageSquare } from "react-icons/fi";
import UploadPage from "./pages/UploadPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const bg = useColorModeValue("white", "gray.900");

  const [online, setOnline] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const ping = async () => {
      const ok = await healthCheck();
      if (mounted) setOnline(ok);
    };

    ping();
    const t = window.setInterval(ping, 15000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  return (
    <Box minH="100vh">
      <Box bg={bg} borderBottom="1px solid" borderColor="gray.200" position="sticky" top={0} zIndex={10}>
        <Container maxW="1200px" py={3}>
          <Flex align="center" gap={3}>
            <HStack spacing={2}>
              <Box
                w="36px"
                h="36px"
                borderRadius="12px"
                bg="gray.900"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiFileText} />
              </Box>
              <Text fontWeight="800" letterSpacing="-0.02em">
                RAG Workspace
              </Text>
            </HStack>

            <Spacer />

            <HStack spacing={5}>
              <Link as={RouterLink} to="/upload" fontWeight="600" color="gray.700" _hover={{ color: "gray.900" }}>
                Upload
              </Link>
              <Link as={RouterLink} to="/chat" fontWeight="600" color="gray.700" _hover={{ color: "gray.900" }}>
                Chat
              </Link>

              <Badge
                colorScheme={online === null ? "gray" : online ? "green" : "red"}
                borderRadius="999px"
                px={3}
                py={1}
                textTransform="none"
                fontWeight="700"
              >
                {online === null ? "Checking…" : online ? "Backend Online" : "Backend Offline"}
              </Badge>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="1200px" py={{ base: 6, md: 8 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </Container>

      <Box py={10}>
        <Container maxW="1200px">
          <Text fontSize="sm" color="gray.500">
            Tip: Uploading a new PDF replaces the active document context for chat.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
