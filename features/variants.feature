Feature: Curate recipe variants
  As someone tidying a big imported collection
  I want to confirm, merge, re-lead and split the variant groupings
  So that "one dish, many swaps" reflects reality and survives re-import

  Background:
    Given an imported dish "curry" with variants "white, brown, cauli" led by "white"
    And a standalone recipe "soup"

  Scenario: With no overrides the dish follows the import grouping
    Then the dish for "brown" has members "white, brown, cauli" led by "white"

  Scenario: Confirming a set with a chosen lead overrides the grouping
    When I set a variant override for "white, brown" led by "brown"
    Then the dish for "brown" has members "white, brown" led by "brown"

  Scenario: A recipe belongs to at most one override
    Given I set a variant override for "white, brown" led by "white"
    When I set a variant override for "brown, cauli" led by "cauli"
    Then the dish for "white" has members "white" led by "white"
    And the dish for "brown" has members "brown, cauli" led by "cauli"

  Scenario: Merging an outside recipe into a dish
    When I set a variant override for "white, soup" led by "white"
    Then the dish for "soup" has members "white, soup" led by "white"

  Scenario: Removing a member detaches it and keeps the rest grouped
    Given I set a variant override for "white, brown, cauli" led by "white"
    When I remove "cauli" from that dish
    Then the dish for "cauli" has members "cauli" led by "cauli"
    And the dish for "white" has members "white, brown" led by "white"

  Scenario: Deleting a member removes it from the dish and the collection
    Given I set a variant override for "white, brown, cauli" led by "white"
    When I delete recipe "cauli"
    Then recipe "cauli" no longer exists
    And the dish for "white" has members "white, brown" led by "white"

  Scenario: Deleting the lead promotes a remaining member to lead
    Given I set a variant override for "white, brown, cauli" led by "white"
    When I delete recipe "white"
    Then recipe "white" no longer exists
    And the dish for "brown" has members "brown, cauli" led by "brown"

  Scenario: Deleting a variant lands on the dish's next member
    Given I set a variant override for "white, brown, cauli" led by "white"
    Then deleting "brown" would next show "white"
    And deleting "white" would next show "brown"

  Scenario: Deleting the final variant falls back to Browse
    Given I set a variant override for "white, brown, cauli" led by "white"
    When I delete recipe "brown"
    And I delete recipe "cauli"
    Then deleting "white" would next show Browse
    And deleting "soup" would next show Browse

  Scenario: Dissolving an override reverts to the import grouping
    Given I set a variant override for "white, brown" led by "brown"
    When I dissolve that dish
    Then the dish for "brown" has members "white, brown, cauli" led by "white"
