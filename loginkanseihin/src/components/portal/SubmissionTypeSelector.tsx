"use client";

import { IconArticle, IconBox, IconCheck } from "@tabler/icons-react";
import { Box, Flex, Grid, Heading, Text } from "@yamada-ui/react";
import { useState } from "react";

const submissionTypes = [
	{
		id: "article",
		label: "記事",
		eyebrow: "ARTICLE",
		description: "活動報告やイベント、学習内容を文章中心で投稿します。",
		icon: IconArticle,
	},
	{
		id: "artifact",
		label: "成果物",
		eyebrow: "WORK",
		description: "制作したアプリ、分析結果、資料などを成果物として投稿します。",
		icon: IconBox,
	},
] as const;

type SubmissionType = (typeof submissionTypes)[number]["id"];

export default function SubmissionTypeSelector() {
	const [selectedType, setSelectedType] = useState<SubmissionType | null>(null);
	const selectedLabel = submissionTypes.find(
		({ id }) => id === selectedType,
	)?.label;

	return (
		<>
			<Grid
				templateColumns={{ base: "repeat(2, 1fr)", md: "1fr" }}
				gap="5"
				mt="8"
				role="group"
				aria-label="投稿する内容"
			>
				{submissionTypes.map(
					({ id, label, eyebrow, description, icon: TypeIcon }) => {
						const selected = selectedType === id;

						return (
							<Box
								as="button"
								type="button"
								key={id}
								aria-pressed={selected}
								onClick={() => setSelectedType(id)}
								border="2px solid"
								borderColor={selected ? "banner" : "gray.200"}
								bgColor={selected ? "gray.50" : "white"}
								color="black"
								cursor="pointer"
								p="7"
								textAlign="left"
								transitionDuration="normal"
								transitionProperty="common"
								_hover={{ borderColor: "banner", bgColor: "gray.50" }}
								_focusVisible={{
									outline: "3px solid",
									outlineColor: "banner",
									outlineOffset: "3px",
								}}
							>
								<Flex align="start" justify="space-between" color="banner">
									<TypeIcon size={32} stroke={1.8} aria-hidden="true" />
									<Flex align="center" gap="2">
										{selected ? (
											<IconCheck size={18} stroke={2.5} aria-hidden="true" />
										) : null}
										<Text fontSize="xs" fontWeight="bold" letterSpacing="wider">
											{selected ? "選択中" : eyebrow}
										</Text>
									</Flex>
								</Flex>
								<Heading as="h3" size="lg" mt="6">
									{label}
								</Heading>
								<Text color="gray.700" mt="3">
									{description}
								</Text>
							</Box>
						);
					},
				)}
			</Grid>
			<Box
				mt="5"
				borderLeft="4px solid"
				borderLeftColor="banner"
				bgColor="gray.50"
				p="4"
			>
				<Text aria-live="polite" color="gray.700">
					{selectedLabel
						? `「${selectedLabel}」を選択しています。`
						: "投稿する内容を選択してください。"}
				</Text>
			</Box>
		</>
	);
}
